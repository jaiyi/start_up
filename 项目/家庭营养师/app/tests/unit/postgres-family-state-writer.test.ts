import type { QueryResult } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { createPostgresFamilyStateWriter } from '../../src/adapters/postgres/postgres-family-state-writer.js';

const familyId = '11111111-1111-1111-1111-111111111111';
const actorId = '22222222-2222-2222-2222-222222222222';
const inventoryItemId = '44444444-4444-4444-4444-444444444441';
const mealEventId = '88888888-8888-8888-8888-888888888881';

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

describe('Milestone 4 Postgres family state writer', () => {
  it('records purchases through the approved SQL function only', async () => {
    const { pool, calls } = createPool([
      {
        tool_call_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        call_status: 'succeeded',
        purchase_record_id: '55555555-5555-5555-5555-555555555551',
        inventory_changes: [{ inventory_item_id: inventoryItemId, item_name: '西兰花', before_quantity: 0, after_quantity: 350, unit: 'g' }]
      }
    ]);
    const writer = createPostgresFamilyStateWriter(pool);

    const result = await writer.recordPurchaseAfterConfirmation({
      familyId,
      actorId,
      idempotencyKey: 'purchase-key',
      confirmed: true,
      confirmationText: '确认记录采购',
      purchasedOn: '2026-09-28',
      source: 'manual',
      currency: 'CNY',
      items: [{ itemName: '西兰花', category: 'vegetable', quantity: 350, unit: 'g', storageLocation: 'fridge' }]
    });

    expect(calls[0]?.text).toContain('family_state.record_purchase_after_confirmation');
    expect(calls[0]?.text).not.toMatch(/insert\s+into\s+family_state\.(inventory_items|purchase_records|purchase_items)/i);
    expect(calls[0]?.values[0]).toBe(familyId);
    expect(calls[0]?.values[1]).toBe(actorId);
    expect(calls[0]?.values[2]).toEqual(expect.objectContaining({ confirmed: true }));
    expect(result.inventoryChanges[0]).toEqual(expect.objectContaining({ itemName: '西兰花', afterQuantity: 350 }));
  });

  it('confirms meal execution through the approved SQL function only', async () => {
    const { pool, calls } = createPool([
      {
        tool_call_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
        call_status: 'succeeded',
        meal_event_id: mealEventId,
        inventory_changes: [{ inventory_item_id: inventoryItemId, item_name: '菠菜', before_quantity: 500, after_quantity: 380, unit: 'g' }]
      }
    ]);
    const writer = createPostgresFamilyStateWriter(pool);

    const result = await writer.confirmMealExecution({
      familyId,
      actorId,
      idempotencyKey: 'meal-key',
      confirmed: true,
      confirmationText: '确认已做饭并扣库存',
      cookedAt: '2026-09-28T18:30:00+08:00',
      mealScene: 'dinner',
      status: 'cooked',
      items: [{ recipeTitle: '菠菜鸡蛋快手菜' }],
      consumptions: [{ inventoryItemId, quantity: 120, unit: 'g' }]
    });

    expect(calls[0]?.text).toContain('family_state.confirm_meal_execution');
    expect(calls[0]?.text).not.toMatch(/insert\s+into\s+family_state\.(meal_events|inventory_events)/i);
    expect(calls[0]?.values[2]).toEqual(expect.objectContaining({ confirmed: true }));
    expect(result.mealEventId).toBe(mealEventId);
  });

  it('records feedback and adjustment rows through approved SQL functions only', async () => {
    const feedbackPool = createPool([
      {
        tool_call_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
        call_status: 'succeeded',
        feedback_id: '99999999-9999-9999-9999-999999999991',
        requires_human_review: true
      }
    ]);
    const adjustmentPool = createPool([
      {
        tool_call_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
        call_status: 'succeeded',
        inventory_item_id: inventoryItemId,
        item_name: '菠菜',
        before_quantity: 380,
        after_quantity: 360,
        unit: 'g'
      }
    ]);

    await createPostgresFamilyStateWriter(feedbackPool.pool).recordMealFeedback({
      familyId,
      actorId,
      idempotencyKey: 'feedback-key',
      confirmed: true,
      confirmationText: '确认记录反馈',
      mealEventId,
      rating: 'liked',
      requiresHumanReview: true
    });
    await createPostgresFamilyStateWriter(adjustmentPool.pool).adjustInventoryAfterFeedback({
      familyId,
      actorId,
      idempotencyKey: 'adjust-key',
      confirmed: true,
      confirmationText: '确认调整库存',
      inventoryItemId,
      adjustmentType: 'adjust',
      quantityDelta: -20,
      unit: 'g',
      reason: '实际剩余比预计少'
    });

    expect(feedbackPool.calls[0]?.text).toContain('family_state.record_meal_feedback');
    expect(feedbackPool.calls[0]?.text).not.toMatch(/insert\s+into\s+family_state\.meal_feedback/i);
    expect(adjustmentPool.calls[0]?.text).toContain('family_state.adjust_inventory_after_feedback');
    expect(adjustmentPool.calls[0]?.text).not.toMatch(/update\s+family_state\.inventory_items/i);
  });

  it('maps replayed JSON inventory changes defensively', async () => {
    const { pool } = createPool([
      {
        tool_call_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
        call_status: 'replayed',
        purchase_record_id: '55555555-5555-5555-5555-555555555552',
        inventory_changes: JSON.stringify([{ before_quantity: '1.5', after_quantity: '2.5' }])
      }
    ]);
    const writer = createPostgresFamilyStateWriter(pool);

    const result = await writer.recordPurchaseAfterConfirmation({
      familyId,
      actorId,
      idempotencyKey: 'purchase-replay-key',
      confirmed: true,
      confirmationText: '确认重复调用返回同一结果',
      purchasedOn: '2026-09-28',
      source: 'manual',
      currency: 'CNY',
      items: [{ itemName: '番茄', category: 'vegetable', quantity: 2.5, unit: '个', storageLocation: 'fridge' }]
    });

    expect(result.status).toBe('replayed');
    expect(result.inventoryChanges).toEqual([
      {
        inventoryItemId: '',
        itemName: '',
        beforeQuantity: 1.5,
        afterQuantity: 2.5,
        unit: ''
      }
    ]);
  });

  it('returns empty inventory changes for non-array SQL JSON payloads', async () => {
    const { pool } = createPool([
      {
        tool_call_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
        call_status: 'succeeded',
        meal_event_id: mealEventId,
        inventory_changes: JSON.stringify({ ignored: true })
      }
    ]);
    const writer = createPostgresFamilyStateWriter(pool);

    const result = await writer.confirmMealExecution({
      familyId,
      actorId,
      idempotencyKey: 'meal-empty-changes-key',
      confirmed: true,
      confirmationText: '确认跳过本餐',
      cookedAt: '2026-09-28T18:30:00+08:00',
      mealScene: 'dinner',
      status: 'skipped',
      items: [{ recipeTitle: '外出就餐' }],
      consumptions: []
    });

    expect(result.inventoryChanges).toEqual([]);
  });

  it('throws when an approved SQL function returns no rows', async () => {
    const { pool } = createPool([]);
    const writer = createPostgresFamilyStateWriter(pool);

    await expect(
      writer.recordMealFeedback({
        familyId,
        actorId,
        idempotencyKey: 'missing-row-key',
        confirmed: true,
        confirmationText: '确认记录反馈',
        mealEventId,
        rating: 'neutral',
        requiresHumanReview: false
      })
    ).rejects.toThrow('record_meal_feedback returned no rows');
  });
});
