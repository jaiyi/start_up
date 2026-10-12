import { describe, expect, it } from 'vitest';
import {
  adjustInventoryAfterFeedbackInputSchema,
  confirmMealExecutionInputSchema,
  recordMealFeedbackInputSchema,
  recordPurchaseAfterConfirmationInputSchema
} from '../../src/mcp/schemas/write-state-schemas.js';

const familyId = '11111111-1111-1111-1111-111111111111';
const actorId = '22222222-2222-2222-2222-222222222222';
const inventoryItemId = '44444444-4444-4444-4444-444444444441';
const mealPlanId = '66666666-6666-6666-6666-666666666661';
const mealPlanItemId = '66666666-6666-6666-6666-666666666671';
const plannedConsumptionId = '77777777-7777-7777-7777-777777777771';
const mealEventId = '88888888-8888-8888-8888-888888888881';
const familyMemberId = '33333333-3333-3333-3333-333333333331';

const confirmedBase = {
  family_id: familyId,
  actor_id: actorId,
  idempotency_key: 'wechat-message-001',
  confirmed: true,
  confirmation_text: '确认记录这次家庭营养状态变化'
} as const;

describe('Milestone 4 write-state input schemas', () => {
  it('accepts confirmed purchase writes with normalized defaults', () => {
    const parsed = recordPurchaseAfterConfirmationInputSchema.parse({
      ...confirmedBase,
      purchased_on: '2026-09-28',
      items: [
        {
          item_name: '西兰花',
          category: 'vegetable',
          quantity: 350,
          unit: 'g',
          storage_location: 'fridge',
          expires_at: '2026-10-02'
        }
      ]
    });

    expect(parsed.source).toBe('manual');
    expect(parsed.currency).toBe('CNY');
    expect(parsed.items[0]).toEqual(
      expect.objectContaining({ item_name: '西兰花', quantity: 350, purchased_at: '2026-09-28' })
    );
  });

  it('rejects write inputs without explicit confirmation', () => {
    expect(() =>
      recordPurchaseAfterConfirmationInputSchema.parse({
        ...confirmedBase,
        confirmed: false,
        purchased_on: '2026-09-28',
        items: [{ item_name: '西兰花', category: 'vegetable', quantity: 350, unit: 'g', storage_location: 'fridge' }]
      })
    ).toThrow();
    expect(() =>
      recordMealFeedbackInputSchema.parse({
        ...confirmedBase,
        confirmation_text: ' ',
        meal_event_id: mealEventId,
        rating: 'liked',
        requires_human_review: false
      })
    ).toThrow();
  });

  it('rejects invalid UUIDs, impossible dates, and non-positive quantities', () => {
    expect(() =>
      recordPurchaseAfterConfirmationInputSchema.parse({
        ...confirmedBase,
        family_id: 'not-a-uuid',
        purchased_on: '2026-09-28',
        items: [{ item_name: '西兰花', category: 'vegetable', quantity: 350, unit: 'g', storage_location: 'fridge' }]
      })
    ).toThrow();
    expect(() =>
      confirmMealExecutionInputSchema.parse({
        ...confirmedBase,
        cooked_at: '2026-02-30T08:00:00+08:00',
        meal_scene: 'breakfast',
        status: 'cooked',
        items: [{ recipe_title: '菠菜鸡蛋快手菜' }],
        consumptions: [{ inventory_item_id: inventoryItemId, quantity: 100, unit: 'g' }]
      })
    ).toThrow();
    expect(() =>
      adjustInventoryAfterFeedbackInputSchema.parse({
        ...confirmedBase,
        inventory_item_id: inventoryItemId,
        adjustment_type: 'discard',
        quantity_delta: 10,
        unit: 'g',
        reason: '坏了'
      })
    ).toThrow();
  });

  it('accepts meal execution, feedback, and inventory adjustment payloads', () => {
    const meal = confirmMealExecutionInputSchema.parse({
      ...confirmedBase,
      meal_plan_id: mealPlanId,
      cooked_at: '2026-09-28T18:30:00+08:00',
      meal_scene: 'dinner',
      status: 'partially_cooked',
      items: [{ meal_plan_item_id: mealPlanItemId, recipe_title: '菠菜鸡蛋快手菜', actual_servings: 2 }],
      consumptions: [{ planned_consumption_id: plannedConsumptionId, inventory_item_id: inventoryItemId, quantity: 120, unit: 'g' }]
    });
    const feedback = recordMealFeedbackInputSchema.parse({
      ...confirmedBase,
      meal_event_id: mealEventId,
      family_member_id: familyMemberId,
      rating: 'liked',
      feedback_text: '宝宝吃得不错',
      suggested_preference_update: '宝宝接受菠菜鸡蛋组合',
      requires_human_review: true
    });
    const adjustment = adjustInventoryAfterFeedbackInputSchema.parse({
      ...confirmedBase,
      inventory_item_id: inventoryItemId,
      adjustment_type: 'adjust',
      quantity_delta: -20,
      unit: 'g',
      reason: '实际剩余比预计少'
    });

    expect(meal.consumptions).toHaveLength(1);
    expect(feedback.requires_human_review).toBe(true);
    expect(adjustment.quantity_delta).toBe(-20);
  });

  it('allows skipped meal confirmations without consumptions', () => {
    const parsed = confirmMealExecutionInputSchema.parse({
      ...confirmedBase,
      cooked_at: '2026-09-28T18:30:00+08:00',
      meal_scene: 'dinner',
      status: 'skipped',
      items: [{ recipe_title: '原计划晚餐' }],
      consumptions: []
    });

    expect(parsed.status).toBe('skipped');
    expect(parsed.consumptions).toEqual([]);
  });
});
