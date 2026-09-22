import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseHealth, DatabaseHealthChecker } from '../../ports/database-health.js';

const REQUIRED_TABLES = [
  'families',
  'actors',
  'family_members',
  'inventory_items',
  'inventory_events',
  'purchase_records',
  'purchase_items',
  'meal_plans',
  'meal_plan_items',
  'planned_consumptions',
  'meal_events',
  'meal_event_items',
  'meal_feedback',
  'mcp_tool_calls',
  'audit_log'
] as const;

type HealthRow = QueryResultRow & {
  readonly schema_exists: boolean;
  readonly existing_table_count: string | number;
};

type QueryablePool = {
  readonly query: <T extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]) => Promise<QueryResult<T>>;
  readonly end: () => Promise<void>;
};

const HEALTH_QUERY = `
  SELECT schema_exists, existing_table_count
  FROM family_state.check_runtime_health($1::text[])
`;

const elapsedMs = (startedAt: bigint): number => Number((process.hrtime.bigint() - startedAt) / 1_000_000n);

export const createPostgresHealthChecker = (pool: QueryablePool): DatabaseHealthChecker => ({
  check: async (): Promise<DatabaseHealth> => {
    const startedAt = process.hrtime.bigint();

    try {
      const result = await pool.query<HealthRow>(HEALTH_QUERY, [[...REQUIRED_TABLES]]);
      const row = result.rows[0];
      const existingTableCount = Number(row?.existing_table_count ?? 0);
      const schemaReady = Boolean(row?.schema_exists) && existingTableCount === REQUIRED_TABLES.length;

      return {
        status: schemaReady ? 'ok' : 'unavailable',
        schema: schemaReady ? 'ready' : 'missing',
        latencyMs: elapsedMs(startedAt)
      };
    } catch {
      return {
        status: 'unavailable',
        schema: 'unknown',
        latencyMs: elapsedMs(startedAt)
      };
    }
  },
  close: async (): Promise<void> => {
    await pool.end();
  }
});
