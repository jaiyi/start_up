import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const { Client } = pg;

const repoRoot = join(process.cwd(), '..');
const migrationSql = readFileSync(join(repoRoot, 'state', 'migrations', '0001_init_family_state.sql'), 'utf8');
const seedSql = readFileSync(join(repoRoot, 'state', 'seeds', '0001_demo_family.sql'), 'utf8');

type PgClient = InstanceType<typeof Client>;

const tableExists = async (client: PgClient, tableName: string): Promise<boolean> => {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'family_state'
        AND table_name = $1
    )`,
    [tableName]
  );

  return result.rows[0]?.exists ?? false;
};

describe('Milestone 1 Postgres migration contract', () => {
  let container: StartedPostgreSqlContainer;
  let client: PgClient;

  beforeAll(async () => {
    try {
      container = await new PostgreSqlContainer('postgres:16').start();
    } catch (error) {
      throw new Error(
        `Docker container runtime is required for npm run test:integration. Start Docker and rerun this command. Cause: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }

    client = new Client({ connectionString: container.getConnectionUri() });
    await client.connect();
    await client.query(migrationSql);
    await client.query(seedSql);
  }, 120_000);

  afterAll(async () => {
    await client?.end();
    await container?.stop();
  }, 30_000);

  it('creates all core tables in the family_state schema', async () => {
    const tableNames = [
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
    ];

    const existenceChecks = await Promise.all(tableNames.map((tableName) => tableExists(client, tableName)));

    expect(existenceChecks.every(Boolean)).toBe(true);
  });

  it('loads demo seed data', async () => {
    const result = await client.query<{ display_name: string }>(
      `SELECT display_name FROM family_state.families WHERE id = $1`,
      ['11111111-1111-1111-1111-111111111111']
    );

    expect(result.rows[0]?.display_name).toBe('Demo Family');
  });

  it('rejects negative current inventory quantity', async () => {
    await expect(
      client.query(
        `INSERT INTO family_state.inventory_items (
          family_id,
          item_name,
          category,
          quantity,
          unit,
          storage_location
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        ['11111111-1111-1111-1111-111111111111', '负数测试食材', 'other', -1, 'g', 'fridge']
      )
    ).rejects.toThrow();
  });

  it('rejects invalid inventory event signs for semantic reconciliation', async () => {
    await expect(
      client.query(
        `INSERT INTO family_state.inventory_events (
          family_id,
          inventory_item_id,
          actor_id,
          event_type,
          quantity_delta,
          unit,
          reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          '11111111-1111-1111-1111-111111111111',
          '44444444-4444-4444-4444-444444444441',
          '22222222-2222-2222-2222-222222222222',
          'consume',
          10,
          'g',
          'Invalid positive consume event.'
        ]
      )
    ).rejects.toThrow();
  });

  it('rejects duplicate idempotency keys for the same family and tool', async () => {
    const values = [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      'record_purchase_after_confirmation',
      'duplicate-key-demo',
      'hash-001'
    ];

    await client.query(
      `INSERT INTO family_state.mcp_tool_calls (
        family_id,
        actor_id,
        tool_name,
        idempotency_key,
        request_hash
      ) VALUES ($1, $2, $3, $4, $5)`,
      values
    );

    await expect(
      client.query(
        `INSERT INTO family_state.mcp_tool_calls (
          family_id,
          actor_id,
          tool_name,
          idempotency_key,
          request_hash
        ) VALUES ($1, $2, $3, $4, $5)`,
        values
      )
    ).rejects.toThrow();
  });

  it('rejects cross-family references through composite foreign keys', async () => {
    await client.query(
      `INSERT INTO family_state.families (id, display_name, timezone)
       VALUES ($1, $2, $3)`,
      ['12121212-1212-1212-1212-121212121212', 'Other Demo Family', 'Asia/Shanghai']
    );

    await expect(
      client.query(
        `INSERT INTO family_state.purchase_items (
          family_id,
          purchase_record_id,
          item_name,
          quantity,
          unit,
          category
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          '12121212-1212-1212-1212-121212121212',
          '55555555-5555-5555-5555-555555555551',
          '跨家庭测试食材',
          1,
          '份',
          'other'
        ]
      )
    ).rejects.toThrow();
  });
});
