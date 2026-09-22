import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig, type AppConfig } from '../../src/config/load-config.js';
import { startHttpServer } from '../../src/mcp/server.js';

const servers: http.Server[] = [];

const closeServer = async (server: http.Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const startTestServer = async (): Promise<number> => {
  const config: AppConfig = {
    mcpAuthToken: 'test-token-value',
    nodeEnv: 'test',
    port: 0
  };
  const server = startHttpServer(config);
  servers.push(server);

  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected TCP server address');
  }

  return address.port;
};

afterEach(async () => {
  const closingServers = servers.splice(0).map((server) => closeServer(server));
  await Promise.all(closingServers);
});

describe('Milestone 0 HTTP server runtime', () => {
  it('starts a real HTTP server and serves authenticated health checks', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { authorization: 'Bearer test-token-value' }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('ok');
  });

  it('rejects unauthenticated MCP requests before parsing request bodies', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      body: 'not-json'
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('rejects invalid JSON-RPC requests without leaking secrets', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { authorization: 'Bearer test-token-value' },
      body: 'not-json'
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(body)).not.toContain('test-token-value');
  });

  it('serves tools through the real HTTP server', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/tools`, {
      headers: { authorization: 'Bearer test-token-value', 'x-request-id': 'req-1', 'x-trace-id': 'trace-1' }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.metadata).toEqual({ request_id: 'req-1', trace_id: 'trace-1' });
    expect(body.data.tools).toHaveLength(1);
  });

  it('returns sanitized not found responses', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/unknown`, {
      headers: { authorization: 'Bearer test-token-value' }
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('fails fast before startup when required config is missing', () => {
    const result = loadConfig({ NODE_ENV: 'test' });

    expect(result.ok).toBe(false);
  });
});
