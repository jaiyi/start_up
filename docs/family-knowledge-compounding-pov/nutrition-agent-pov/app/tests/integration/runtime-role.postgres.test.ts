import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createPostgresHealthChecker } from '../../src/adapters/postgres/postgres-health-checker.js';

const { Client } = pg;

const repoRoot = join(process.cwd(), '..');
const migrationSql = readFileSync(join(repoRoot, 'state', 'migrations', '0001_init_family_state.sql'), 'utf8');
const runtimePermissionsSql = readFileSync(join(repoRoot, 'state', 'migrations', '0002_runtime_permissions.sql'), 'utf8');
const runtimeRoleScriptSql = readFileSync(join(repoRoot, 'infra', 'postgres', 'create-runtime-app-role.sql'), 'utf8');
const seedSql = readFileSync(join(repoRoot, 'state', 'seeds', '0001_demo_family.sql'), 'utf8');

const appUser = 'family_nutrition_app_test';
const appPassword = 'test-runtime-password';

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

describe('Milestone 2 runtime Postgres role contract', () => {
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
    await runPsqlScriptInContainer(container, '/tmp/create-runtime-app-role.sql', runtimeRoleScriptSql, {
      app_user: appUser,
      app_password: appPassword
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

  it('allows the runtime app role to run the database health check', async () => {
    const checker = createPostgresHealthChecker({
      query: appClient.query.bind(appClient),
      end: async () => undefined
    });

    await expect(checker.check()).resolves.toEqual(
      expect.objectContaining({
        status: 'ok',
        schema: 'ready'
      })
    );
  });

  it('prevents the runtime app role from creating schema objects', async () => {
    await expect(appClient.query('CREATE TABLE family_state.runtime_forbidden_table (id uuid)')).rejects.toThrow();
  });

  it('prevents the runtime app role from reading business tables directly', async () => {
    await expect(appClient.query('SELECT count(*) FROM family_state.inventory_items')).rejects.toThrow();
  });

  it('prevents the runtime app role from writing business state', async () => {
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
        ['11111111-1111-1111-1111-111111111111', '只读权限测试', 'other', 1, '份', 'fridge']
      )
    ).rejects.toThrow();
  });
});
