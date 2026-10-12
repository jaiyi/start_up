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
const writeFunctionsSql = readFileSync(join(repoRoot, 'state', 'migrations', '0004_write_business_functions.sql'), 'utf8');
const runtimeRoleScriptSql = readFileSync(join(repoRoot, 'infra', 'postgres', 'create-runtime-app-role.sql'), 'utf8');
const seedSql = readFileSync(join(repoRoot, 'state', 'seeds', '0001_demo_family.sql'), 'utf8');

const appUser = 'family_nutrition_write_app_test';
const appPassword = 'test-runtime-password';
const familyId = '11111111-1111-1111-1111-111111111111';
const otherFamilyId = '11111111-1111-1111-1111-111111111112';
const actorId = '22222222-2222-2222-2222-222222222222';
const inventoryItemId = '44444444-4444-4444-4444-444444444441';
const mealPlanId = '66666666-6666-6666-6666-666666666661';
const mealPlanItemId = '66666666-6666-6666-6666-666666666671';
const plannedConsumptionId = '77777777-7777-7777-7777-777777777771';

const baseMeta = {
  idempotency_key: 'write-test-key',
  confirmed: true,
  confirmation_text: '确认执行测试写入'
} as const;

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

describe('Milestone 4 confirmed write runtime Postgres functions', () => {
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
    await ownerClient.query(writeFunctionsSql);
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

  it('records a confirmed purchase and increases inventory exactly once for idempotent replay', async () => {
    const payload = {
      ...baseMeta,
      idempotency_key: 'purchase-idempotent-key',
      purchased_on: '2026-09-28',
      source: 'manual',
      currency: 'CNY',
      items: [{ item_name: '西兰花', category: 'vegetable', quantity: 350, unit: 'g', storage_location: 'fridge' }]
    };

    const first = await appClient.query<{ call_status: string; purchase_record_id: string; inventory_changes: unknown }>(
      'SELECT * FROM family_state.record_purchase_after_confirmation($1::uuid, $2::uuid, $3::jsonb)',
      [familyId, actorId, payload]
    );
    const second = await appClient.query<{ call_status: string; purchase_record_id: string }>(
      'SELECT * FROM family_state.record_purchase_after_confirmation($1::uuid, $2::uuid, $3::jsonb)',
      [familyId, actorId, payload]
    );
    const inventory = await ownerClient.query<{ quantity: string }>(
      `SELECT quantity FROM family_state.inventory_items WHERE family_id = $1 AND item_name = '西兰花' AND unit = 'g'`,
      [familyId]
    );

    expect(first.rows[0]?.call_status).toBe('succeeded');
    expect(second.rows[0]?.call_status).toBe('replayed');
    expect(second.rows[0]?.purchase_record_id).toBe(first.rows[0]?.purchase_record_id);
    expect(Number(inventory.rows[0]?.quantity)).toBe(350);
  });

  it('rejects the same idempotency key with a different request hash', async () => {
    const payload = {
      ...baseMeta,
      idempotency_key: 'purchase-conflict-key',
      purchased_on: '2026-09-28',
      items: [{ item_name: '苹果', category: 'fruit', quantity: 2, unit: '个', storage_location: 'fridge' }]
    };

    await appClient.query('SELECT * FROM family_state.record_purchase_after_confirmation($1::uuid, $2::uuid, $3::jsonb)', [
      familyId,
      actorId,
      payload
    ]);

    await expect(
      appClient.query('SELECT * FROM family_state.record_purchase_after_confirmation($1::uuid, $2::uuid, $3::jsonb)', [
        familyId,
        actorId,
        { ...payload, items: [{ item_name: '苹果', category: 'fruit', quantity: 3, unit: '个', storage_location: 'fridge' }] }
      ])
    ).rejects.toThrow('idempotency key conflict');
  });

  it('confirms cooked meals by creating a meal event and consuming inventory', async () => {
    const result = await appClient.query<{ call_status: string; meal_event_id: string; inventory_changes: unknown }>(
      'SELECT * FROM family_state.confirm_meal_execution($1::uuid, $2::uuid, $3::jsonb)',
      [
        familyId,
        actorId,
        {
          ...baseMeta,
          idempotency_key: 'meal-confirm-key',
          meal_plan_id: mealPlanId,
          cooked_at: '2026-09-28T18:30:00+08:00',
          meal_scene: 'dinner',
          status: 'cooked',
          items: [{ meal_plan_item_id: mealPlanItemId, recipe_title: '菠菜鸡蛋快手菜', actual_servings: 2 }],
          consumptions: [{ planned_consumption_id: plannedConsumptionId, inventory_item_id: inventoryItemId, quantity: 120, unit: 'g' }]
        }
      ]
    );
    const inventory = await ownerClient.query<{ quantity: string }>('SELECT quantity FROM family_state.inventory_items WHERE id = $1', [
      inventoryItemId
    ]);

    expect(result.rows[0]?.call_status).toBe('succeeded');
    expect(result.rows[0]?.meal_event_id).toBeTruthy();
    expect(Number(inventory.rows[0]?.quantity)).toBe(380);
  });

  it('does not consume inventory for skipped meals', async () => {
    const before = await ownerClient.query<{ quantity: string }>('SELECT quantity FROM family_state.inventory_items WHERE id = $1', [inventoryItemId]);

    await appClient.query('SELECT * FROM family_state.confirm_meal_execution($1::uuid, $2::uuid, $3::jsonb)', [
      familyId,
      actorId,
      {
        ...baseMeta,
        idempotency_key: 'meal-skipped-key',
        cooked_at: '2026-09-29T18:30:00+08:00',
        meal_scene: 'dinner',
        status: 'skipped',
        items: [{ recipe_title: '临时取消晚餐' }],
        consumptions: []
      }
    ]);
    const after = await ownerClient.query<{ quantity: string }>('SELECT quantity FROM family_state.inventory_items WHERE id = $1', [inventoryItemId]);

    expect(Number(after.rows[0]?.quantity)).toBe(Number(before.rows[0]?.quantity));
  });

  it('rejects malformed direct JSON payloads at the database boundary', async () => {
    await expect(
      appClient.query('SELECT * FROM family_state.record_purchase_after_confirmation($1::uuid, $2::uuid, $3::jsonb)', [
        familyId,
        actorId,
        { ...baseMeta, idempotency_key: 'empty-purchase-items-key', purchased_on: '2026-09-28', items: [] }
      ])
    ).rejects.toThrow('items must contain at least 1 item');

    await expect(
      appClient.query('SELECT * FROM family_state.confirm_meal_execution($1::uuid, $2::uuid, $3::jsonb)', [
        familyId,
        actorId,
        {
          ...baseMeta,
          idempotency_key: 'cooked-without-consumptions-key',
          cooked_at: '2026-09-30T18:30:00+08:00',
          meal_scene: 'dinner',
          status: 'cooked',
          items: [{ recipe_title: '未扣库存的测试菜' }],
          consumptions: []
        }
      ])
    ).rejects.toThrow('consumptions must contain at least 1 item');

    await expect(
      appClient.query('SELECT * FROM family_state.record_meal_feedback($1::uuid, $2::uuid, $3::jsonb)', [
        familyId,
        actorId,
        { ...baseMeta, idempotency_key: 'invalid-rating-key', meal_event_id: '88888888-8888-8888-8888-888888888881', rating: 'great' }
      ])
    ).rejects.toThrow('invalid meal feedback rating');

    await expect(
      appClient.query('SELECT * FROM family_state.adjust_inventory_after_feedback($1::uuid, $2::uuid, $3::jsonb)', [
        familyId,
        actorId,
        {
          ...baseMeta,
          idempotency_key: 'invalid-adjustment-type-key',
          inventory_item_id: inventoryItemId,
          adjustment_type: 'rewrite',
          quantity_delta: -1,
          unit: 'g',
          reason: '测试非法调整类型'
        }
      ])
    ).rejects.toThrow('invalid inventory adjustment type');
  });

  it('rejects inventory deductions that would make quantity negative', async () => {
    await expect(
      appClient.query('SELECT * FROM family_state.adjust_inventory_after_feedback($1::uuid, $2::uuid, $3::jsonb)', [
        familyId,
        actorId,
        {
          ...baseMeta,
          idempotency_key: 'negative-adjust-key',
          inventory_item_id: inventoryItemId,
          adjustment_type: 'discard',
          quantity_delta: -10_000,
          unit: 'g',
          reason: '测试不能扣成负数'
        }
      ])
    ).rejects.toThrow('inventory quantity cannot be negative');
  });

  it('rejects inventory deductions with mismatched units without mutating state', async () => {
    const beforeInventory = await ownerClient.query<{ quantity: string }>('SELECT quantity FROM family_state.inventory_items WHERE id = $1', [
      inventoryItemId
    ]);
    const beforeEvents = await ownerClient.query<{ count: string }>(
      `SELECT count(*) FROM family_state.inventory_events WHERE family_id = $1 AND inventory_item_id = $2`,
      [familyId, inventoryItemId]
    );

    await expect(
      appClient.query('SELECT * FROM family_state.confirm_meal_execution($1::uuid, $2::uuid, $3::jsonb)', [
        familyId,
        actorId,
        {
          ...baseMeta,
          idempotency_key: 'meal-unit-mismatch-key',
          cooked_at: '2026-10-01T18:30:00+08:00',
          meal_scene: 'dinner',
          status: 'cooked',
          items: [{ recipe_title: '单位不匹配测试菜' }],
          consumptions: [{ inventory_item_id: inventoryItemId, quantity: 1, unit: 'kg' }]
        }
      ])
    ).rejects.toThrow('inventory unit mismatch');

    const afterInventory = await ownerClient.query<{ quantity: string }>('SELECT quantity FROM family_state.inventory_items WHERE id = $1', [
      inventoryItemId
    ]);
    const afterEvents = await ownerClient.query<{ count: string }>(
      `SELECT count(*) FROM family_state.inventory_events WHERE family_id = $1 AND inventory_item_id = $2`,
      [familyId, inventoryItemId]
    );

    expect(Number(afterInventory.rows[0]?.quantity)).toBe(Number(beforeInventory.rows[0]?.quantity));
    expect(Number(afterEvents.rows[0]?.count)).toBe(Number(beforeEvents.rows[0]?.count));
  });

  it('rejects inventory adjustments with mismatched units without mutating state', async () => {
    const beforeInventory = await ownerClient.query<{ quantity: string }>('SELECT quantity FROM family_state.inventory_items WHERE id = $1', [
      inventoryItemId
    ]);
    const beforeEvents = await ownerClient.query<{ count: string }>(
      `SELECT count(*) FROM family_state.inventory_events WHERE family_id = $1 AND inventory_item_id = $2`,
      [familyId, inventoryItemId]
    );

    await expect(
      appClient.query('SELECT * FROM family_state.adjust_inventory_after_feedback($1::uuid, $2::uuid, $3::jsonb)', [
        familyId,
        actorId,
        {
          ...baseMeta,
          idempotency_key: 'adjust-unit-mismatch-key',
          inventory_item_id: inventoryItemId,
          adjustment_type: 'discard',
          quantity_delta: -1,
          unit: 'kg',
          reason: '测试单位不匹配'
        }
      ])
    ).rejects.toThrow('inventory unit mismatch');

    const afterInventory = await ownerClient.query<{ quantity: string }>('SELECT quantity FROM family_state.inventory_items WHERE id = $1', [
      inventoryItemId
    ]);
    const afterEvents = await ownerClient.query<{ count: string }>(
      `SELECT count(*) FROM family_state.inventory_events WHERE family_id = $1 AND inventory_item_id = $2`,
      [familyId, inventoryItemId]
    );

    expect(Number(afterInventory.rows[0]?.quantity)).toBe(Number(beforeInventory.rows[0]?.quantity));
    expect(Number(afterEvents.rows[0]?.count)).toBe(Number(beforeEvents.rows[0]?.count));
  });

  it('records meal feedback without changing markdown-backed preference state', async () => {
    const meal = await ownerClient.query<{ id: string }>('SELECT id FROM family_state.meal_events WHERE family_id = $1 LIMIT 1', [familyId]);
    const result = await appClient.query<{ call_status: string; feedback_id: string; requires_human_review: boolean }>(
      'SELECT * FROM family_state.record_meal_feedback($1::uuid, $2::uuid, $3::jsonb)',
      [
        familyId,
        actorId,
        {
          ...baseMeta,
          idempotency_key: 'feedback-key',
          meal_event_id: meal.rows[0]?.id,
          rating: 'liked',
          feedback_text: '宝宝吃得不错',
          suggested_preference_update: '宝宝接受菠菜鸡蛋组合',
          requires_human_review: true
        }
      ]
    );

    expect(result.rows[0]).toEqual(expect.objectContaining({ call_status: 'succeeded', requires_human_review: true }));
  });

  it('rejects unauthorized families and still prevents direct runtime table writes', async () => {
    await expect(
      appClient.query('SELECT * FROM family_state.record_meal_feedback($1::uuid, $2::uuid, $3::jsonb)', [
        otherFamilyId,
        actorId,
        { ...baseMeta, idempotency_key: 'unauthorized-key', meal_event_id: '88888888-8888-8888-8888-888888888881', rating: 'liked' }
      ])
    ).rejects.toThrow('family_id is not allowed');

    await expect(
      appClient.query(
        `INSERT INTO family_state.inventory_items (family_id, item_name, category, quantity, unit, storage_location) VALUES ($1, $2, $3, $4, $5, $6)`,
        [familyId, '直接写入测试', 'other', 1, '份', 'fridge']
      )
    ).rejects.toThrow();
  });
});
