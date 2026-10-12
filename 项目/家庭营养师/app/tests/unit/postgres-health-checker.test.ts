import type { QueryResult } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { createPostgresHealthChecker } from '../../src/adapters/postgres/postgres-health-checker.js';

type QueryCall = {
  readonly text: string;
  readonly values: readonly unknown[];
};

const createPool = (row: Record<string, unknown>) => {
  const calls: QueryCall[] = [];

  return {
    calls,
    pool: {
      query: vi.fn(async (text: string, values: readonly unknown[] = []) => {
        calls.push({ text, values });
        return { rows: [row] } as QueryResult;
      }),
      end: vi.fn(async () => undefined)
    }
  };
};

describe('Postgres health checker', () => {
  it('requires Milestone 4 tables and runtime functions to report ready', async () => {
    const { pool, calls } = createPool({ schema_exists: true, existing_table_count: 16, executable_function_count: 9 });
    const checker = createPostgresHealthChecker(pool);

    await expect(checker.check()).resolves.toEqual(expect.objectContaining({ status: 'ok', schema: 'ready' }));
    expect(calls[0]?.values[0]).toContain('runtime_family_access');
    expect(calls[0]?.values[1]).toContain('family_state.record_purchase_after_confirmation(uuid, uuid, jsonb)');
    expect(calls[0]?.text).toContain('has_function_privilege');
  });

  it('reports missing schema when Milestone 4 functions are absent', async () => {
    const { pool } = createPool({ schema_exists: true, existing_table_count: 16, executable_function_count: 8 });
    const checker = createPostgresHealthChecker(pool);

    await expect(checker.check()).resolves.toEqual(expect.objectContaining({ status: 'unavailable', schema: 'missing' }));
  });

  it('reports missing schema when Milestone 4 access table is absent', async () => {
    const { pool } = createPool({ schema_exists: true, existing_table_count: 15, executable_function_count: 9 });
    const checker = createPostgresHealthChecker(pool);

    await expect(checker.check()).resolves.toEqual(expect.objectContaining({ status: 'unavailable', schema: 'missing' }));
  });

  it('closes the underlying pool', async () => {
    const { pool } = createPool({ schema_exists: true, existing_table_count: 16, executable_function_count: 9 });
    const checker = createPostgresHealthChecker(pool);

    await checker.close();

    expect(pool.end).toHaveBeenCalled();
  });
});
