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
  'audit_log',
  'runtime_family_access'
] as const;

const REQUIRED_RUNTIME_FUNCTIONS = [
  'family_state.read_current_inventory(uuid, boolean, integer)',
  'family_state.read_inventory_risk_candidates(uuid, date, boolean, integer)',
  'family_state.read_recent_meals(uuid, integer)',
  'family_state.read_pending_planned_consumptions(uuid, date, date, integer)',
  'family_state.read_meal_feedback_rows(uuid, integer)',
  'family_state.record_purchase_after_confirmation(uuid, uuid, jsonb)',
  'family_state.confirm_meal_execution(uuid, uuid, jsonb)',
  'family_state.record_meal_feedback(uuid, uuid, jsonb)',
  'family_state.adjust_inventory_after_feedback(uuid, uuid, jsonb)'
] as const;

type HealthRow = QueryResultRow & {
  readonly schema_exists: boolean;
  readonly existing_table_count: string | number;
  readonly executable_function_count: string | number;
};

type QueryablePool = {
  readonly query: <T extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]) => Promise<QueryResult<T>>;
  readonly end: () => Promise<void>;
};

const HEALTH_QUERY = `
  WITH runtime_health AS (
    SELECT schema_exists, existing_table_count
    FROM family_state.check_runtime_health($1::text[])
  ),
  required_functions AS (
    SELECT to_regprocedure(signature) AS function_oid
    FROM unnest($2::text[]) AS signature
  ),
  function_readiness AS (
    SELECT count(*) AS executable_function_count
    FROM required_functions
    WHERE function_oid IS NOT NULL
      AND has_function_privilege(current_user, function_oid, 'EXECUTE')
  )
  SELECT
    runtime_health.schema_exists,
    runtime_health.existing_table_count,
    function_readiness.executable_function_count
  FROM runtime_health, function_readiness
`;

const elapsedMs = (startedAt: bigint): number => Number((process.hrtime.bigint() - startedAt) / 1_000_000n);

export const createPostgresHealthChecker = (pool: QueryablePool): DatabaseHealthChecker => ({
  check: async (): Promise<DatabaseHealth> => {
    const startedAt = process.hrtime.bigint();

    try {
      const result = await pool.query<HealthRow>(HEALTH_QUERY, [[...REQUIRED_TABLES], [...REQUIRED_RUNTIME_FUNCTIONS]]);
      const row = result.rows[0];
      const existingTableCount = Number(row?.existing_table_count ?? 0);
      const executableFunctionCount = Number(row?.executable_function_count ?? 0);
      const schemaReady =
        Boolean(row?.schema_exists) &&
        existingTableCount === REQUIRED_TABLES.length &&
        executableFunctionCount === REQUIRED_RUNTIME_FUNCTIONS.length;

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
