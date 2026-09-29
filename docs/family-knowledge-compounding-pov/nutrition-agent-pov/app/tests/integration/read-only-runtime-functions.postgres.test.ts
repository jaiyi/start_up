import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const { Client } = pg;

const repoRoot = join(process.cwd(), '..');
const migrationSql = readFileSync(join(repoRoot, 'state', 'migrations', '0001_init_family_state.sql'), 'utf8');
const runtimePermissionsSql = readFileSync(join(repoRoot, 'state', 'migrations', '0002_runtime_permissions.sql'), 'utf8');
const readOnlyFunctionsSql = readFileSync(join(repoRoot, 'state', 'migrations', '0003_read_only_business_functions.sql'), 'utf8');
const runtimeRoleScriptSql = readFileSync(join(repoRoot, 'infra', 'postgres', 'create-runtime-app-role.sql'), 'utf8');
const seedSql = readFileSync(join(repoRoot, 'state', 'seeds', '0001_demo_family.sql'), 'utf8');

const appUser = 'family_nutrition_readonly_app_test';
const appPassword = 'test-runtime-password';
const familyId = '11111111-1111-1111-1111-111111111111';
const otherFamilyId = '11111111-1111-1111-1111-111111111112';

type PgClient = InstanceType<typeof Client>;

const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;

const runPsqlScriptInContainer = async (
  container: StartedPostgreSqlContainer,
  scriptPath: string,
  scriptContent: string,
  variables: Readonly<Record<string, string>> = {}
): Promise<void> => {
  const variableArgs = Object.entries(variables)
    .map(([name, value]) => `-v ${name}=${shellQuote(value)}`)
    .join(' ');
  const command = [
    `cat > ${shellQuote(scriptPath)} <<'SQL'`,
    scriptContent,
    'SQL',
    `psql -U ${shellQuote(container.getUsername())} -d ${shellQuote(container.getDatabase())} ${variableArgs} -f ${shellQuote(scriptPath)}`
  ].join('\n');
  const result = await container.exec(['sh', '-lc', command]);

  if (result.exitCode !== 0) {
    throw new Error(`psql script failed: ${result.output}`);
  }
};

describe('Milestone 3 read-only runtime Postgres functions', () => {
  let container: StartedPostgreSqlContainer;
  let ownerClient: PgClient;
  let appClient: PgClient;

  beforeAll(async () => {
    try {
      container = await new PostgreSqlContainer('postgres:16').start();
    } catch (error) {
      throw new Error(
        `Docker container runtime is required for npm run test:integration. Start Docker and rerun this command. Cause: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }

    ownerClient = new Client({ connectionString: container.getConnectionUri() });
    await ownerClient.connect();
    await ownerClient.query(migrationSql);
    await ownerClient.query(seedSql);
    await ownerClient.query(runtimePermissionsSql);
    await ownerClient.query(readOnlyFunctionsSql);
    await runPsqlScriptInContainer(container, '/tmp/create-runtime-app-role.sql', runtimeRoleScriptSql, {
      app_user: appUser,
      app_password: appPassword,
      app_family_ids: familyId
    });

    appClient = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: appUser,
      password: appPassword
    });
    await appClient.connect();
  }, 120_000);

  afterAll(async () => {
    await appClient?.end();
    await ownerClient?.end();
    await container?.stop();
  }, 30_000);

  it('allows the runtime role to read current inventory through approved functions', async () => {
    const result = await appClient.query<{ item_name: string }>(
      'SELECT item_name FROM family_state.read_current_inventory($1::uuid, false, 50)',
      [familyId]
    );
    const itemNames = result.rows.map((row) => row.item_name).sort();

    expect(itemNames).toEqual(['菠菜', '鸡蛋'].sort());
  });

  it('allows the runtime role to read recent meals and feedback rows', async () => {
    const meals = await appClient.query<{ items: unknown }>('SELECT items FROM family_state.read_recent_meals($1::uuid, 20)', [familyId]);
    const feedback = await appClient.query<{ rating: string }>('SELECT rating FROM family_state.read_meal_feedback_rows($1::uuid, 20)', [
      familyId
    ]);

    expect(JSON.stringify(meals.rows[0]?.items)).toContain('菠菜鸡蛋快手菜');
    expect(feedback.rows[0]?.rating).toBe('liked');
  });

  it('returns planned consumptions and their execution state for the demo plan', async () => {
    const result = await appClient.query<{ item_name: string; meal_event_id: string | null }>(
      'SELECT item_name, meal_event_id FROM family_state.read_pending_planned_consumptions($1::uuid, NULL::date, NULL::date, 50)',
      [familyId]
    );

    expect(result.rows[0]).toEqual(expect.objectContaining({ item_name: '菠菜' }));
    expect(result.rows[0]?.meal_event_id).toBe('88888888-8888-8888-8888-888888888881');
  });

  it('rejects runtime read functions for families not assigned to the login role', async () => {
    await expect(
      appClient.query('SELECT item_name FROM family_state.read_current_inventory($1::uuid, false, 50)', [otherFamilyId])
    ).rejects.toThrow('family_id is not allowed');
  });

  it('orders inventory risk candidates before applying the result limit', async () => {
    const fillerValues = Array.from({ length: 105 }, (_, index) => {
      const itemNumber = String(index + 1).padStart(3, '0');

      return `('${familyId}'::uuid, '常温库存${itemNumber}', 'other', 1, '份', 'pantry', '2026-09-01'::date, NULL::date)`;
    }).join(', ');

    await ownerClient.query(`
      INSERT INTO family_state.inventory_items (
        family_id,
        item_name,
        category,
        quantity,
        unit,
        storage_location,
        purchased_at,
        expires_at
      ) VALUES ${fillerValues}
    `);
    await ownerClient.query(
      `INSERT INTO family_state.inventory_items (
        family_id,
        item_name,
        category,
        quantity,
        unit,
        storage_location,
        purchased_at,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date)`,
      [familyId, '必须优先出现的过期库存', 'protein', 1, '份', 'fridge', '2026-09-27', '2026-09-27']
    );

    const result = await appClient.query<{ item_name: string }>(
      'SELECT item_name FROM family_state.read_inventory_risk_candidates($1::uuid, $2::date, false, 1)',
      [familyId, '2026-09-28']
    );

    expect(result.rows.map((row) => row.item_name)).toEqual(['必须优先出现的过期库存']);
  });

  it('excludes skipped meal events from recent cooked meal reads', async () => {
    await ownerClient.query(
      `INSERT INTO family_state.meal_events (
        id,
        family_id,
        actor_id,
        cooked_at,
        meal_scene,
        status,
        notes
      ) VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7)`,
      [
        '88888888-8888-8888-8888-888888889999',
        familyId,
        '22222222-2222-2222-2222-222222222222',
        '2026-09-22T08:00:00+08:00',
        'breakfast',
        'skipped',
        'should not be returned as cooked history'
      ]
    );

    const result = await appClient.query<{ status: string }>('SELECT status FROM family_state.read_recent_meals($1::uuid, 20)', [familyId]);

    expect(result.rows.map((row) => row.status)).not.toContain('skipped');
  });

  it('still prevents direct table reads and writes by the runtime role', async () => {
    await expect(appClient.query('SELECT count(*) FROM family_state.inventory_items')).rejects.toThrow();
    await expect(
      appClient.query(
        `INSERT INTO family_state.inventory_items (
          family_id,
          item_name,
          category,
          quantity,
          unit,
          storage_location
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [familyId, '只读函数写入测试', 'other', 1, '份', 'fridge']
      )
    ).rejects.toThrow();
  });
});
