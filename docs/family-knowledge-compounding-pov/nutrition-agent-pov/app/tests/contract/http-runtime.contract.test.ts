import { describe, expect, it } from 'vitest';
import { createHttpHandler } from '../../src/mcp/server.js';

const config = {
  mcpAuthToken: 'test-token-value',
  nodeEnv: 'test',
  port: 3099
};

const createRequest = (path: string, init: RequestInit = {}): Request =>
  new Request(`http://localhost${path}`, init);

describe('Milestone 0 HTTP runtime', () => {
  it('rejects unauthenticated health checks before business logic', async () => {
    const handler = createHttpHandler(config);
    const response = await handler(createRequest('/health'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      data: null,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      metadata: {}
    });
  });

  it('returns health check with a valid token', async () => {
    const handler = createHttpHandler(config);
    const response = await handler(
      createRequest('/health', { headers: { authorization: 'Bearer test-token-value' } })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      status: 'ok',
      service: 'family-nutrition-state-mcp',
      milestone: '0'
    });
  });

  it('returns the safe tool list with a valid token', async () => {
    const handler = createHttpHandler(config);
    const response = await handler(
      createRequest('/tools', { headers: { authorization: 'Bearer test-token-value' } })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.tools).toEqual([
      {
        name: 'health_check',
        title: 'Health check',
        description: 'Checks whether the Family Nutrition MCP service is running.',
        readOnly: true
      }
    ]);
  });

  it('passes request and trace IDs through response metadata', async () => {
    const handler = createHttpHandler(config);
    const response = await handler(
      createRequest('/health', {
        headers: {
          authorization: 'Bearer test-token-value',
          'x-request-id': 'req-1',
          'x-trace-id': 'trace-1'
        }
      })
    );
    const body = await response.json();

    expect(body.metadata).toEqual({ request_id: 'req-1', trace_id: 'trace-1' });
  });
});
