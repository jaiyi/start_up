import { describe, expect, it, vi } from 'vitest';
import { createHttpHandler } from '../../src/mcp/server.js';
import type { DatabaseHealthChecker } from '../../src/ports/database-health.js';

const config = {
  mcpAuthToken: 'test-token-value',
  nodeEnv: 'test',
  port: 3099,
  databaseUrl: 'postgresql://family_nutrition_app:secret-password@127.0.0.1:5432/family_nutrition',
  databasePoolMax: 2,
  databaseConnectionTimeoutMs: 2000,
  databaseIdleTimeoutMs: 10000,
  databaseStatementTimeoutMs: 3000
};

const createHealthyChecker = (): DatabaseHealthChecker => ({
  check: vi.fn(async () => ({ status: 'ok' as const, schema: 'ready' as const, latencyMs: 5 })),
  close: vi.fn(async () => undefined)
});

const createRequest = (path: string, init: RequestInit = {}): Request => new Request(`http://localhost${path}`, init);

describe('Milestone 2 HTTP runtime', () => {
  it('rejects unauthenticated health checks before database checks', async () => {
    const checker = createHealthyChecker();
    const handler = createHttpHandler(config, { databaseHealthChecker: checker });
    const response = await handler(createRequest('/health'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
    expect(checker.check).not.toHaveBeenCalled();
  });

  it('returns DB-backed health check with a valid token', async () => {
    const checker = createHealthyChecker();
    const handler = createHttpHandler(config, { databaseHealthChecker: checker });
    const response = await handler(createRequest('/health', { headers: { authorization: 'Bearer test-token-value' } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      status: 'ok',
      service: 'family-nutrition-state-mcp',
      milestone: '2',
      database: {
        status: 'ok',
        schema: 'ready',
        latencyMs: 5
      }
    });
    expect(checker.check).toHaveBeenCalledTimes(1);
  });

  it('returns 503 when the database is unavailable without leaking secrets', async () => {
    const checker: DatabaseHealthChecker = {
      check: vi.fn(async () => ({ status: 'unavailable' as const, schema: 'unknown' as const, latencyMs: 3 })),
      close: vi.fn(async () => undefined)
    };
    const handler = createHttpHandler(config, { databaseHealthChecker: checker });
    const response = await handler(
      createRequest('/health', {
        headers: { authorization: 'Bearer test-token-value' }
      })
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('degraded');
    expect(body.data.database.status).toBe('unavailable');
    expect(serialized).not.toContain('secret-password');
    expect(serialized).not.toContain('postgresql://');
    expect(serialized).not.toContain('test-token-value');
  });

  it('returns the safe tool list with a valid token', async () => {
    const handler = createHttpHandler(config, { databaseHealthChecker: createHealthyChecker() });
    const response = await handler(createRequest('/tools', { headers: { authorization: 'Bearer test-token-value' } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.tools).toEqual([
      {
        name: 'health_check',
        title: 'Health check',
        description: 'Checks whether the Family Nutrition MCP service and Postgres state database are running.',
        readOnly: true
      }
    ]);
  });

  it('passes request and trace IDs through response metadata', async () => {
    const handler = createHttpHandler(config, { databaseHealthChecker: createHealthyChecker() });
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
