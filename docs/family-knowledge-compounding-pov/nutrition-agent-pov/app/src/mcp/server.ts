import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { AppConfig } from '../config/load-config.js';
import { authenticateRequest } from './auth.js';
import { createErrorResponse, createSuccessResponse, type ResponseMetadata } from './response.js';
import { listRegisteredTools } from './tool-registry.js';

const HEALTH_CHECK_RESPONSE = {
  status: 'ok',
  service: 'family-nutrition-state-mcp',
  milestone: '0'
} as const;

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' } as const;

const sendJson = (res: ServerResponse, statusCode: number, body: unknown): void => {
  res.writeHead(statusCode, jsonHeaders);
  res.end(JSON.stringify(body));
};

const createJsonResponse = (statusCode: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: jsonHeaders
  });

const readJsonBody = async (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      if (!rawBody) {
        resolve(undefined);
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });

const metadataFromHeaders = (headers: Headers): ResponseMetadata => {
  const requestId = headers.get('x-request-id') ?? undefined;
  const traceId = headers.get('x-trace-id') ?? undefined;

  return {
    ...(requestId ? { requestId } : {}),
    ...(traceId ? { traceId } : {})
  };
};

const metadataFromNodeRequest = (req: IncomingMessage): ResponseMetadata => {
  const requestIdHeader = req.headers['x-request-id'];
  const traceIdHeader = req.headers['x-trace-id'];
  const requestId = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;
  const traceId = Array.isArray(traceIdHeader) ? traceIdHeader[0] : traceIdHeader;

  return {
    ...(requestId ? { requestId } : {}),
    ...(traceId ? { traceId } : {})
  };
};

export const createMcpServer = (): McpServer => {
  const server = new McpServer({
    name: 'family-nutrition-state-mcp',
    version: '0.1.0'
  });

  server.registerTool(
    'health_check',
    {
      title: 'Health check',
      description: 'Checks whether the Family Nutrition MCP service is running.',
      inputSchema: {},
      outputSchema: {
        status: z.literal('ok'),
        service: z.literal('family-nutrition-state-mcp'),
        milestone: z.literal('0')
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => ({
      structuredContent: HEALTH_CHECK_RESPONSE,
      content: [{ type: 'text', text: JSON.stringify(HEALTH_CHECK_RESPONSE) }]
    })
  );

  return server;
};

export const createHttpHandler = (config: AppConfig) => {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const metadata = metadataFromHeaders(request.headers);
    const authResult = authenticateRequest(Object.fromEntries(request.headers.entries()), config);

    if (!authResult.ok) {
      return createJsonResponse(401, createErrorResponse(authResult.errorCode, 'Authentication required', metadata));
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return createJsonResponse(200, createSuccessResponse(HEALTH_CHECK_RESPONSE, metadata));
    }

    if (url.pathname === '/tools' && request.method === 'GET') {
      return createJsonResponse(200, createSuccessResponse({ tools: listRegisteredTools() }, metadata));
    }

    return createJsonResponse(404, createErrorResponse('NOT_FOUND', 'Route not found', metadata));
  };
};

export const createNodeHttpHandler = (config: AppConfig) => {
  const fetchHandler = createHttpHandler(config);

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const requestUrl = req.url ?? '/';
    const metadata = metadataFromNodeRequest(req);

    if (requestUrl === '/mcp' && req.method === 'POST') {
      const authResult = authenticateRequest(req.headers, config);
      if (!authResult.ok) {
        sendJson(res, 401, createErrorResponse(authResult.errorCode, 'Authentication required', metadata));
        return;
      }

      try {
        const parsedBody = await readJsonBody(req);
        const server = createMcpServer();
        const transport = new StreamableHTTPServerTransport({});
        await server.connect(transport as never);
        await transport.handleRequest(req, res, parsedBody);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected MCP request failure';
        sendJson(res, 400, createErrorResponse('VALIDATION_ERROR', message, metadata));
      }
      return;
    }

    const request = new Request(`http://localhost${requestUrl}`, {
      method: req.method ?? 'GET',
      headers: req.headers as HeadersInit
    });
    const response = await fetchHandler(request);
    const body = await response.text();

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(body);
  };
};

export const startHttpServer = (config: AppConfig): http.Server => {
  const handler = createNodeHttpHandler(config);
  const server = http.createServer((req, res) => {
    handler(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unexpected server failure';
      sendJson(res, 500, createErrorResponse('INTERNAL_ERROR', message));
    });
  });

  server.listen(config.port);
  return server;
};
