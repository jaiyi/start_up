import type { QueryResult } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { createPostgresFamilyStateReader } from '../../src/adapters/postgres/postgres-family-state-reader.js';

const familyId = '11111111-1111-1111-1111-111111111111';

type QueryCall = {
  readonly text: string;
  readonly values: readonly unknown[];
};

const createPool = (rows: readonly Record<string, unknown>[]) => {
  const calls: QueryCall[] = [];

  return {
    calls,
    pool: {
      query: vi.fn(async (text: string, values: readonly unknown[] = []) => {
        calls.push({ text, values });
        return { rows } as QueryResult;
      })
    }
  };
};

describe('Milestone 3 Postgres family state reader', () => {
  it('maps current inventory rows and calls only the approved SQL function', async () => {
    const { pool, calls } = createPool([
      {
        id: '44444444-4444-4444-4444-444444444441',
        family_id: familyId,
        item_name: '菠菜',
        category: 'vegetable',
        quantity: '500',
        unit: 'g',
        storage_location: 'fridge',
        purchased_at: '2026-09-20',
        expires_at: '2026-09-24',
        last_event_at: '2026-09-20T10:00:00.000Z',
        notes: 'Demo vegetable',
        updated_at: '2026-09-20T10:00:00.000Z'
      }
    ]);

    const reader = createPostgresFamilyStateReader(pool);
    const result = await reader.getCurrentInventory({ familyId, includeZero: false, limit: 5 });

    expect(calls[0]?.text).toContain('family_state.read_current_inventory');
    expect(calls[0]?.text).not.toMatch(/from\s+family_state\.inventory_items/i);
    expect(calls[0]?.values).toEqual([familyId, false, 5]);
    expect(result[0]).toEqual(
      expect.objectContaining({ itemName: '菠菜', quantity: 500, purchasedAt: '2026-09-20', expiresAt: '2026-09-24' })
    );
  });

  it('maps inventory risk candidate rows and calls only the approved risk SQL function', async () => {
    const { pool, calls } = createPool([
      {
        id: '44444444-4444-4444-4444-444444441001',
        family_id: familyId,
        item_name: '临期牛奶',
        category: 'dairy',
        quantity: '2',
        unit: '盒',
        storage_location: 'fridge',
        purchased_at: '2026-09-10',
        expires_at: '2026-09-29',
        last_event_at: null,
        notes: null,
        updated_at: '2026-09-20T10:00:00.000Z'
      }
    ]);

    const reader = createPostgresFamilyStateReader(pool);
    const result = await reader.getInventoryRiskCandidates({ familyId, asOfDate: '2026-09-28', includeLowRisk: false, limit: 10 });

    expect(calls[0]?.text).toContain('family_state.read_inventory_risk_candidates');
    expect(calls[0]?.text).not.toMatch(/from\s+family_state\.inventory_items/i);
    expect(calls[0]?.values).toEqual([familyId, '2026-09-28', false, 10]);
    expect(result[0]).toEqual(expect.objectContaining({ itemName: '临期牛奶', expiresAt: '2026-09-29' }));
  });

  it('maps recent meal JSON rows from Postgres', async () => {
    const { pool, calls } = createPool([
      {
        meal_event_id: '88888888-8888-8888-8888-888888888881',
        meal_plan_id: '66666666-6666-6666-6666-666666666661',
        cooked_at: '2026-09-21T00:00:00.000Z',
        meal_scene: 'breakfast',
        status: 'cooked',
        notes: null,
        items: JSON.stringify([{ recipe_ref: 'demo/spinach-egg', recipe_title: '菠菜鸡蛋快手菜', actual_servings: '2' }])
      }
    ]);

    const reader = createPostgresFamilyStateReader(pool);
    const result = await reader.listRecentMeals({ familyId, limit: 3 });

    expect(calls[0]?.text).toContain('family_state.read_recent_meals');
    expect(calls[0]?.values).toEqual([familyId, 3]);
    expect(result[0]?.items).toEqual([{ recipeRef: 'demo/spinach-egg', recipeTitle: '菠菜鸡蛋快手菜', actualServings: 2 }]);
  });

  it('maps planned consumptions with date window parameters and execution state', async () => {
    const { pool, calls } = createPool([
      {
        planned_consumption_id: '77777777-7777-7777-7777-777777777771',
        meal_plan_id: '66666666-6666-6666-6666-666666666661',
        meal_plan_item_id: '66666666-6666-6666-6666-666666666671',
        plan_date: '2026-09-21',
        meal_scene: 'breakfast',
        plan_status: 'planned',
        recipe_ref: 'demo/spinach-egg',
        recipe_title: '菠菜鸡蛋快手菜',
        dish_role: 'main',
        inventory_item_id: '44444444-4444-4444-4444-444444444441',
        item_name: '菠菜',
        planned_quantity: '150',
        unit: 'g',
        inventory_quantity: '500',
        storage_location: 'fridge',
        expires_at: '2026-09-24',
        meal_event_id: '88888888-8888-8888-8888-888888888881',
        notes: null
      }
    ]);

    const reader = createPostgresFamilyStateReader(pool);
    const result = await reader.listPendingPlannedConsumptions({
      familyId,
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
      limit: 2
    });

    expect(calls[0]?.text).toContain('family_state.read_pending_planned_consumptions');
    expect(calls[0]?.values).toEqual([familyId, '2026-09-01', '2026-09-30', 2]);
    expect(result[0]).toEqual(expect.objectContaining({ itemName: '菠菜', plannedQuantity: 150, inventoryQuantity: 500 }));
  });

  it('maps null dates, Date instances, and non-array JSON values safely', async () => {
    const { pool } = createPool([
      {
        id: '44444444-4444-4444-4444-444444444442',
        family_id: familyId,
        item_name: '鸡蛋',
        category: 'protein',
        quantity: 12,
        unit: '个',
        storage_location: 'fridge',
        purchased_at: null,
        expires_at: new Date('2026-10-05T00:00:00.000Z'),
        last_event_at: null,
        notes: null,
        updated_at: new Date('2026-09-20T10:00:00.000Z')
      }
    ]);

    const reader = createPostgresFamilyStateReader(pool);
    const inventory = await reader.getCurrentInventory({ familyId, includeZero: true, limit: 1 });

    expect(inventory[0]).toEqual(expect.objectContaining({ purchasedAt: null, expiresAt: '2026-10-05' }));

    const emptyJsonPool = createPool([
      {
        meal_event_id: '88888888-8888-8888-8888-888888888882',
        meal_plan_id: null,
        cooked_at: '2026-09-22T00:00:00.000Z',
        meal_scene: 'dinner',
        status: 'cooked',
        notes: null,
        items: '{"unexpected":true}'
      }
    ]);

    const emptyJsonReader = createPostgresFamilyStateReader(emptyJsonPool.pool);
    const meals = await emptyJsonReader.listRecentMeals({ familyId, limit: 1 });

    expect(meals[0]?.items).toEqual([]);
  });

  it('maps meal feedback rows and recipe title JSON arrays', async () => {
    const { pool, calls } = createPool([
      {
        feedback_id: '99999999-9999-9999-9999-999999999991',
        meal_event_id: '88888888-8888-8888-8888-888888888881',
        cooked_at: '2026-09-21T00:00:00.000Z',
        meal_scene: 'breakfast',
        rating: 'liked',
        feedback_text: 'tasted fine',
        suggested_preference_update: null,
        requires_human_review: false,
        family_member_name: 'Demo child',
        family_member_role: 'child',
        recipe_titles: ['菠菜鸡蛋快手菜'],
        created_at: '2026-09-21T01:00:00.000Z'
      }
    ]);

    const reader = createPostgresFamilyStateReader(pool);
    const result = await reader.listMealFeedbackRows({ familyId, limit: 4 });

    expect(calls[0]?.text).toContain('family_state.read_meal_feedback_rows');
    expect(calls[0]?.values).toEqual([familyId, 4]);
    expect(result[0]).toEqual(expect.objectContaining({ rating: 'liked', recipeTitles: ['菠菜鸡蛋快手菜'] }));
  });
});
