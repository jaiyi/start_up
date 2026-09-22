import type { DatabaseHealth, DatabaseHealthChecker } from '../ports/database-health.js';

export type ServiceHealth = {
  readonly status: 'ok' | 'degraded';
  readonly service: 'family-nutrition-state-mcp';
  readonly milestone: '2';
  readonly database: DatabaseHealth;
};

const UNAVAILABLE_DATABASE_HEALTH: DatabaseHealth = {
  status: 'unavailable',
  schema: 'unknown',
  latencyMs: 0
};

export const checkServiceHealth = async (databaseHealthChecker: DatabaseHealthChecker): Promise<ServiceHealth> => {
  try {
    const database = await databaseHealthChecker.check();

    return {
      status: database.status === 'ok' && database.schema === 'ready' ? 'ok' : 'degraded',
      service: 'family-nutrition-state-mcp',
      milestone: '2',
      database
    };
  } catch {
    return {
      status: 'degraded',
      service: 'family-nutrition-state-mcp',
      milestone: '2',
      database: UNAVAILABLE_DATABASE_HEALTH
    };
  }
};
