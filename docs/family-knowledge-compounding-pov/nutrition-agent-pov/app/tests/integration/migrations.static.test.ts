import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(process.cwd(), '..');
const stateDir = join(repoRoot, 'state');
const infraDir = join(repoRoot, 'infra');
const migrationsDir = join(stateDir, 'migrations');
const migrationPath = join(migrationsDir, '0001_init_family_state.sql');
const seedPath = join(stateDir, 'seeds', '0001_demo_family.sql');
const fixturePath = join(stateDir, 'fixtures', 'demo-family-state.json');
const composePath = join(infraDir, 'docker-compose.family-state.example.yml');
const envExamplePath = join(infraDir, 'env.example');

const scopedTables = [
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

const allTables = ['families', ...scopedTables] as const;

const dangerousSqlPatterns = [/drop\s+database/i, /drop\s+schema\s+public/i, /shell_exec/i, /execute\s+program/i];

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{16,}/i,
  /postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/i,
  /password\s*=\s*(?!change-me)[^\s]+/i,
  /token\s*=\s*(?!change-me)[^\s]+/i
];

const readText = (path: string): string => readFileSync(path, 'utf8');

const expectNoSecrets = (content: string): void => {
  secretPatterns.forEach((pattern) => {
    expect(content).not.toMatch(pattern);
  });
};

describe('Milestone 1 migration static contract', () => {
  it('uses sortable SQL migration filenames', () => {
    const migrationFiles = readdirSync(migrationsDir).filter((fileName) => fileName.endsWith('.sql'));

    expect(migrationFiles).toContain('0001_init_family_state.sql');
    expect(migrationFiles).toEqual([...migrationFiles].sort());
    migrationFiles.forEach((fileName) => {
      expect(fileName).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
    });
  });

  it('creates the required family_state schema and core tables', () => {
    const migration = readText(migrationPath);

    expect(migration).toMatch(/create\s+schema\s+if\s+not\s+exists\s+family_state/i);
    allTables.forEach((tableName) => {
      expect(migration).toMatch(new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+family_state\\.${tableName}\\b`, 'i'));
    });
  });

  it('adds family isolation columns and composite parent keys to scoped tables', () => {
    const migration = readText(migrationPath);

    scopedTables.forEach((tableName) => {
      const tablePattern = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+family_state\\.${tableName}([\\s\\S]*?);`, 'i');
      const tableDefinition = migration.match(tablePattern)?.[1] ?? '';

      expect(tableDefinition, `${tableName} should include family_id`).toMatch(/family_id\s+uuid\s+not\s+null/i);
    });

    ['actors', 'family_members', 'inventory_items', 'purchase_records', 'meal_plans', 'meal_events'].forEach((tableName) => {
      const tablePattern = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+family_state\\.${tableName}([\\s\\S]*?);`, 'i');
      const tableDefinition = migration.match(tablePattern)?.[1] ?? '';

      expect(tableDefinition, `${tableName} should expose composite parent key`).toMatch(/unique\s*\(\s*family_id\s*,\s*id\s*\)/i);
    });
  });

  it('defines idempotency, audit, and request tracing constraints', () => {
    const migration = readText(migrationPath);

    expect(migration).toMatch(/unique\s*\(\s*family_id\s*,\s*tool_name\s*,\s*idempotency_key\s*\)/i);
    expect(migration).toMatch(/request_hash\s+text\s+not\s+null/i);
    expect(migration).toMatch(/request_id\s+text/i);
    expect(migration).toMatch(/trace_id\s+text/i);
    expect(migration).toMatch(/create\s+table\s+if\s+not\s+exists\s+family_state\.audit_log/i);
  });

  it('documents inventory non-negative constraints and planned-vs-cooked separation', () => {
    const migration = readText(migrationPath);
    const dataDictionary = readText(join(stateDir, 'data-dictionary.md'));

    expect(migration).toMatch(/quantity\s+numeric\(12,\s*3\)\s+not\s+null/i);
    expect(migration).toMatch(/check\s*\(\s*quantity\s*>=\s*0\s*\)/i);
    expect(migration).toMatch(/planned_consumptions/i);
    expect(dataDictionary).toContain('planned 不等于 cooked');
    expect(dataDictionary).toContain('不会直接扣减库存');
  });

  it('keeps migration and seed SQL free from dangerous operations and real secrets', () => {
    const migration = readText(migrationPath);
    const seed = readText(seedPath);
    const combinedSql = `${migration}\n${seed}`;

    dangerousSqlPatterns.forEach((pattern) => {
      expect(combinedSql).not.toMatch(pattern);
    });
    expectNoSecrets(combinedSql);
  });

  it('keeps infrastructure examples private-by-default', () => {
    const compose = readText(composePath);
    const envExample = readText(envExamplePath);

    expect(compose).toContain('postgres:16');
    expect(compose).toContain('pg_isready');
    expect(compose).not.toMatch(/-\s*["']?5432:5432["']?/);
    expect(compose).toContain('./backups:/backups');
    expect(compose).toContain('./state/migrations:/migrations:ro');
    expect(envExample).toContain('FAMILY_NUTRITION_MIGRATION_DATABASE_URL');
    expect(envExample).toContain('FAMILY_NUTRITION_DATABASE_URL');
    expectNoSecrets(compose);
    expectNoSecrets(envExample);
  });

  it('provides demo-only fixture data with no real household secrets', () => {
    const fixture = JSON.parse(readText(fixturePath)) as {
      readonly family: { readonly id: string; readonly displayName: string };
      readonly inventoryItems: readonly unknown[];
    };

    expect(fixture.family.displayName).toBe('Demo Family');
    expect(fixture.inventoryItems.length).toBeGreaterThan(0);
    expectNoSecrets(JSON.stringify(fixture));
  });
});
