import { describe, expect, it } from 'vitest';
import { checkServiceHealth } from '../../src/application/check-service-health.js';
import type { DatabaseHealthChecker } from '../../src/ports/database-health.js';

const healthyChecker: DatabaseHealthChecker = {
  check: async () => ({
    status: 'ok',
    schema: 'ready',
    latencyMs: 12
  }),
  close: async () => undefined
};

describe('Milestone 2 service health', () => {
  it('returns ok when the database is ready', async () => {
    const health = await checkServiceHealth(healthyChecker);

    expect(health).toEqual({
      status: 'ok',
      service: 'family-nutrition-state-mcp',
      milestone: '2',
      database: {
        status: 'ok',
        schema: 'ready',
        latencyMs: 12
      }
    });
  });

  it('returns degraded when the database is unavailable', async () => {
    const checker: DatabaseHealthChecker = {
      check: async () => ({
        status: 'unavailable',
        schema: 'unknown',
        latencyMs: 7
      }),
      close: async () => undefined
    };

    const health = await checkServiceHealth(checker);

    expect(health.status).toBe('degraded');
    expect(health.database.status).toBe('unavailable');
  });

  it('does not expose raw database error messages', async () => {
    const checker: DatabaseHealthChecker = {
      check: async () => {
        throw new Error('connect ECONNREFUSED postgresql://user:secret@localhost/db');
      },
      close: async () => undefined
    };

    const health = await checkServiceHealth(checker);
    const serialized = JSON.stringify(health);

    expect(health.status).toBe('degraded');
    expect(health.database.status).toBe('unavailable');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('postgresql://');
    expect(serialized).not.toContain('ECONNREFUSED');
  });
});
