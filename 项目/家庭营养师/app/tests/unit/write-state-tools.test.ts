import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import { registerWriteStateTools } from '../../src/mcp/tools/register-write-state-tools.js';
import type { FamilyStateWriter } from '../../src/ports/family-state-writer.js';
import { createEmptyFamilyStateWriter } from '../support/family-state-writer.js';

type ToolResult = {
  readonly structuredContent: Record<string, unknown>;
  readonly content: readonly { readonly type: 'text'; readonly text: string }[];
};

type ToolHandler = (input: unknown) => Promise<ToolResult>;

type ToolConfig = {
  readonly annotations?: Record<string, unknown>;
};

const familyId = '11111111-1111-1111-1111-111111111111';
const otherFamilyId = '11111111-1111-1111-1111-111111111112';
const actorId = '22222222-2222-2222-2222-222222222222';
const inventoryItemId = '44444444-4444-4444-4444-444444444441';
const mealEventId = '88888888-8888-8888-8888-888888888881';
const familyScope = { allowedFamilyIds: [familyId] } as const;

const confirmedBase = {
  family_id: familyId,
  actor_id: actorId,
  idempotency_key: 'wechat-message-001',
  confirmed: true,
  confirmation_text: '确认更新家庭营养状态'
} as const;

const createWriter = (): FamilyStateWriter => ({
  recordPurchaseAfterConfirmation: vi.fn(async () => ({
    toolCallId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    status: 'succeeded' as const,
    purchaseRecordId: '55555555-5555-5555-5555-555555555551',
    inventoryChanges: [{ inventoryItemId, itemName: '西兰花', beforeQuantity: 0, afterQuantity: 350, unit: 'g' }]
  })),
  confirmMealExecution: vi.fn(async () => ({
    toolCallId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    status: 'succeeded' as const,
    mealEventId,
    inventoryChanges: [{ inventoryItemId, itemName: '菠菜', beforeQuantity: 500, afterQuantity: 380, unit: 'g' }]
  })),
  recordMealFeedback: vi.fn(async () => ({
    toolCallId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    status: 'succeeded' as const,
    feedbackId: '99999999-9999-9999-9999-999999999991',
    requiresHumanReview: true
  })),
  adjustInventoryAfterFeedback: vi.fn(async () => ({
    toolCallId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    status: 'succeeded' as const,
    inventoryItemId,
    itemName: '菠菜',
    beforeQuantity: 380,
    afterQuantity: 360,
    unit: 'g'
  }))
});

const registerToolsFor = (writer: FamilyStateWriter) => {
  const handlers = new Map<string, ToolHandler>();
  const configs = new Map<string, ToolConfig>();
  const fakeServer = {
    registerTool: (name: string, config: ToolConfig, handler: ToolHandler) => {
      configs.set(name, config);
      handlers.set(name, handler);
    }
  };

  registerWriteStateTools(fakeServer as unknown as McpServer, writer, familyScope);
  return { handlers, configs };
};

const callTool = async (handlers: ReadonlyMap<string, ToolHandler>, name: string, input: unknown): Promise<ToolResult> => {
  const handler = handlers.get(name);
  if (!handler) {
    throw new Error(`Missing test handler for ${name}`);
  }

  return handler(input);
};

describe('Milestone 4 write-state MCP tools', () => {
  it('registers write tools with non-read-only annotations', () => {
    const { handlers, configs } = registerToolsFor(createWriter());

    expect([...handlers.keys()].sort()).toEqual([
      'adjust_inventory_after_feedback',
      'confirm_meal_execution',
      'record_meal_feedback',
      'record_purchase_after_confirmation'
    ]);
    expect(configs.get('record_purchase_after_confirmation')?.annotations).toEqual(
      expect.objectContaining({ readOnlyHint: false, destructiveHint: false, idempotentHint: true })
    );
    expect(configs.get('confirm_meal_execution')?.annotations).toEqual(expect.objectContaining({ readOnlyHint: false, destructiveHint: true }));
    expect(configs.get('adjust_inventory_after_feedback')?.annotations).toEqual(
      expect.objectContaining({ readOnlyHint: false, destructiveHint: true })
    );
  });

  it('calls the purchase writer and returns consistent structured/text content', async () => {
    const writer = createWriter();
    const { handlers } = registerToolsFor(writer);

    const result = await callTool(handlers, 'record_purchase_after_confirmation', {
      ...confirmedBase,
      purchased_on: '2026-09-28',
      items: [{ item_name: '西兰花', category: 'vegetable', quantity: 350, unit: 'g', storage_location: 'fridge' }]
    });

    expect(writer.recordPurchaseAfterConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ familyId, actorId, idempotencyKey: 'wechat-message-001', confirmed: true, purchasedOn: '2026-09-28' })
    );
    expect(result.structuredContent).toEqual(expect.objectContaining({ familyId, status: 'succeeded' }));
    expect(JSON.parse(result.content[0]?.text ?? '{}')).toEqual(result.structuredContent);
  });

  it('calls meal execution, feedback, and inventory adjustment writers', async () => {
    const writer = createWriter();
    const { handlers } = registerToolsFor(writer);

    await callTool(handlers, 'confirm_meal_execution', {
      ...confirmedBase,
      cooked_at: '2026-09-28T18:30:00+08:00',
      meal_scene: 'dinner',
      status: 'cooked',
      items: [{ recipe_title: '菠菜鸡蛋快手菜' }],
      consumptions: [{ inventory_item_id: inventoryItemId, quantity: 120, unit: 'g' }]
    });
    await callTool(handlers, 'record_meal_feedback', {
      ...confirmedBase,
      meal_event_id: mealEventId,
      rating: 'liked',
      feedback_text: '宝宝吃得不错',
      requires_human_review: true
    });
    await callTool(handlers, 'adjust_inventory_after_feedback', {
      ...confirmedBase,
      inventory_item_id: inventoryItemId,
      adjustment_type: 'adjust',
      quantity_delta: -20,
      unit: 'g',
      reason: '实际剩余比预计少'
    });

    expect(writer.confirmMealExecution).toHaveBeenCalledWith(expect.objectContaining({ familyId, confirmed: true, mealScene: 'dinner' }));
    expect(writer.recordMealFeedback).toHaveBeenCalledWith(expect.objectContaining({ familyId, confirmed: true, mealEventId, rating: 'liked' }));
    expect(writer.adjustInventoryAfterFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ familyId, confirmed: true, inventoryItemId, quantityDelta: -20 })
    );
  });

  it('rejects disallowed family IDs before writing state', async () => {
    const writer = createWriter();
    const { handlers } = registerToolsFor(writer);

    await expect(
      callTool(handlers, 'record_meal_feedback', {
        ...confirmedBase,
        family_id: otherFamilyId,
        meal_event_id: mealEventId,
        rating: 'liked',
        requires_human_review: false
      })
    ).rejects.toThrow('family_id is not allowed');
    expect(writer.recordMealFeedback).not.toHaveBeenCalled();
  });

  it('provides callable empty writer helpers for tests', async () => {
    const writer = createEmptyFamilyStateWriter();

    await expect(
      writer.recordMealFeedback({
        familyId,
        actorId,
        idempotencyKey: 'key',
        confirmed: true,
        confirmationText: 'confirmed',
        mealEventId,
        rating: 'liked',
        requiresHumanReview: false
      })
    ).resolves.toEqual(expect.objectContaining({ status: 'succeeded' }));
  });
});
