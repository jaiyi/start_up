import { describe, expect, it, vi } from 'vitest';
import { createHttpHandler } from '../../src/mcp/server.js';
import type { DatabaseHealthChecker } from '../../src/ports/database-health.js';
import { createEmptyFamilyStateReader } from '../support/family-state-reader.js';
import { createEmptyFamilyStateWriter } from '../support/family-state-writer.js';

const config = {
  mcpAuthToken: 'test-token-value',
  nodeEnv: 'test',
  port: 3099,
  databaseUrl: 'postgresql://family_nutrition_app:secret-password@127.0.0.1:5432/family_nutrition',
  databasePoolMax: 2,
  databaseConnectionTimeoutMs: 2000,
  databaseIdleTimeoutMs: 10000,
  databaseStatementTimeoutMs: 3000,
  allowedFamilyIds: ['11111111-1111-1111-1111-111111111111']
};

const expectedMilestoneFourTools = [
  {
    name: 'get_current_inventory',
    title: 'Get current inventory',
    description: 'Returns active inventory items for a family from the Family Nutrition state database.',
    readOnly: true
  },
  {
    name: 'get_inventory_risks',
    title: 'Get inventory risks',
    description: 'Returns expired, expiring, aging, and overstock risk signals for current inventory.',
    readOnly: true
  },
  {
    name: 'get_meal_feedback_summary',
    title: 'Get meal feedback summary',
    description: 'Returns summarized meal feedback signals and recent review items for a family.',
    readOnly: true
  },
  {
    name: 'health_check',
    title: 'Health check',
    description: 'Checks whether the Family Nutrition MCP service and Postgres state database are running.',
    readOnly: true
  },
  {
    name: 'list_pending_planned_consumptions',
    title: 'List pending planned consumptions',
    description: 'Returns planned ingredient consumptions with execution state for meal plans.',
    readOnly: true
  },
  {
    name: 'list_recent_meals',
    title: 'List recent meals',
    description: 'Returns recent cooked meal records and their dish items for a family.',
    readOnly: true
  },
  {
    name: 'record_purchase_after_confirmation',
    title: 'Record purchase after confirmation',
    description: 'Records confirmed grocery purchases, updates inventory, and writes audit/idempotency records.',
    readOnly: false
  },
  {
    name: 'confirm_meal_execution',
    title: 'Confirm meal execution',
    description: 'Records a confirmed cooked/skipped meal and consumes inventory when applicable.',
    readOnly: false
  },
  {
    name: 'record_meal_feedback',
    title: 'Record meal feedback',
    description: 'Records confirmed meal feedback without directly changing markdown-backed preferences.',
    readOnly: false
  },
  {
    name: 'adjust_inventory_after_feedback',
    title: 'Adjust inventory after feedback',
    description: 'Applies confirmed inventory adjustments, discards, or expirations after user feedback.',
    readOnly: false
  }
] as const;

const createHealthyChecker = (): DatabaseHealthChecker => ({
  check: vi.fn(async () => ({ status: 'ok' as const, schema: 'ready' as const, latencyMs: 5 })),
  close: vi.fn(async () => undefined)
});

const createAppContext = (databaseHealthChecker: DatabaseHealthChecker = createHealthyChecker()) => ({
  databaseHealthChecker,
  familyStateReader: createEmptyFamilyStateReader(),
  familyStateWriter: createEmptyFamilyStateWriter(),
  allowedFamilyIds: config.allowedFamilyIds
});

const createRequest = (path: string, init: RequestInit = {}): Request => new Request(`http://localhost${path}`, init);

describe('Milestone 4 HTTP runtime', () => {
  it('rejects unauthenticated health checks before database checks', async () => {
    const checker = createHealthyChecker();
    const handler = createHttpHandler(config, createAppContext(checker));
    const response = await handler(createRequest('/health'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
    expect(checker.check).not.toHaveBeenCalled();
  });

  it('returns DB-backed health check with a valid token', async () => {
    const checker = createHealthyChecker();
    const handler = createHttpHandler(config, createAppContext(checker));
    const response = await handler(createRequest('/health', { headers: { authorization: 'Bearer test-token-value' } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      status: 'ok',
      service: 'family-nutrition-state-mcp',
      milestone: '4',
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
    const handler = createHttpHandler(config, createAppContext(checker));
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
    const handler = createHttpHandler(config, createAppContext());
    const response = await handler(createRequest('/tools', { headers: { authorization: 'Bearer test-token-value' } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.tools).toEqual(expectedMilestoneFourTools);
    expect(JSON.stringify(body.data.tools)).not.toMatch(/password|token|postgresql:\/\//i);
  });

  it('passes request and trace IDs through response metadata', async () => {
    const handler = createHttpHandler(config, createAppContext());
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
