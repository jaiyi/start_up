import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import { registerReadOnlyStateTools } from '../../src/mcp/tools/register-read-only-state-tools.js';
import type { CurrentInventoryItem, FamilyStateReader, MealFeedbackRow } from '../../src/ports/family-state-reader.js';
import { createEmptyFamilyStateReader } from '../support/family-state-reader.js';

type ToolResult = {
  readonly structuredContent: Record<string, unknown>;
  readonly content: readonly { readonly type: 'text'; readonly text: string }[];
};

type ToolHandler = (input: unknown) => Promise<ToolResult>;

const familyId = '11111111-1111-1111-1111-111111111111';
const otherFamilyId = '11111111-1111-1111-1111-111111111112';
const familyScope = { allowedFamilyIds: [familyId] } as const;

const inventoryItem: CurrentInventoryItem = {
  id: '44444444-4444-4444-4444-444444444441',
  familyId,
  itemName: '菠菜',
  category: 'vegetable',
  quantity: 500,
  unit: 'g',
  storageLocation: 'fridge',
  purchasedAt: '2026-09-20',
  expiresAt: '2026-09-24',
  lastEventAt: null,
  notes: 'Demo vegetable',
  updatedAt: '2026-09-20T10:00:00.000Z'
};

const feedbackRow: MealFeedbackRow = {
  feedbackId: '99999999-9999-9999-9999-999999999991',
  mealEventId: '88888888-8888-8888-8888-888888888881',
  cookedAt: '2026-09-21T00:00:00.000Z',
  mealScene: 'breakfast',
  rating: 'liked',
  feedbackText: 'a'.repeat(170),
  suggestedPreferenceUpdate: null,
  requiresHumanReview: true,
  familyMemberName: 'Demo child',
  familyMemberRole: 'child',
  recipeTitles: ['菠菜鸡蛋快手菜'],
  createdAt: '2026-09-21T01:00:00.000Z'
};

const createReader = (): FamilyStateReader => ({
  getCurrentInventory: vi.fn(async () => [inventoryItem]),
  getInventoryRiskCandidates: vi.fn(async () => [inventoryItem]),
  listRecentMeals: vi.fn(async () => [
    {
      mealEventId: '88888888-8888-8888-8888-888888888881',
      mealPlanId: '66666666-6666-6666-6666-666666666661',
      cookedAt: '2026-09-21T00:00:00.000Z',
      mealScene: 'breakfast',
      status: 'cooked',
      notes: null,
      items: [{ recipeRef: 'demo/spinach-egg', recipeTitle: '菠菜鸡蛋快手菜', actualServings: 2 }]
    }
  ]),
  listPendingPlannedConsumptions: vi.fn(async () => [
    {
      plannedConsumptionId: '77777777-7777-7777-7777-777777777771',
      mealPlanId: '66666666-6666-6666-6666-666666666661',
      mealPlanItemId: '66666666-6666-6666-6666-666666666671',
      planDate: '2026-09-21',
      mealScene: 'breakfast',
      planStatus: 'planned',
      recipeRef: 'demo/spinach-egg',
      recipeTitle: '菠菜鸡蛋快手菜',
      dishRole: 'main',
      inventoryItemId: inventoryItem.id,
      itemName: '菠菜',
      plannedQuantity: 150,
      unit: 'g',
      inventoryQuantity: 500,
      storageLocation: 'fridge',
      expiresAt: '2026-09-24',
      mealEventId: '88888888-8888-8888-8888-888888888881',
      notes: null
    }
  ]),
  listMealFeedbackRows: vi.fn(async () => [feedbackRow])
});

const registerToolsFor = (reader: FamilyStateReader) => {
  const handlers = new Map<string, ToolHandler>();
  const fakeServer = {
    registerTool: (name: string, _config: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    }
  };

  registerReadOnlyStateTools(fakeServer as unknown as McpServer, reader, familyScope);
  return handlers;
};

const callTool = async (handlers: ReadonlyMap<string, ToolHandler>, name: string, input: unknown): Promise<ToolResult> => {
  const handler = handlers.get(name);
  if (!handler) {
    throw new Error(`Missing test handler for ${name}`);
  }

  return handler(input);
};

describe('Milestone 3 read-only state MCP tools', () => {
  it('returns current inventory as structured content and text content', async () => {
    const reader = createReader();
    const handlers = registerToolsFor(reader);

    const result = await callTool(handlers, 'get_current_inventory', { family_id: familyId });

    expect(reader.getCurrentInventory).toHaveBeenCalledWith({ familyId, includeZero: false, limit: 50 });
    expect(result.structuredContent).toEqual({ familyId, count: 1, items: [inventoryItem] });
    expect(JSON.parse(result.content[0]?.text ?? '{}')).toEqual(result.structuredContent);
  });

  it('builds inventory risks from dedicated risk candidate reads', async () => {
    const reader = createReader();
    const handlers = registerToolsFor(reader);

    const result = await callTool(handlers, 'get_inventory_risks', { family_id: familyId, as_of_date: '2026-09-28' });

    expect(reader.getInventoryRiskCandidates).toHaveBeenCalledWith({
      familyId,
      asOfDate: '2026-09-28',
      includeLowRisk: false,
      limit: 50
    });
    expect(reader.getCurrentInventory).not.toHaveBeenCalled();
    expect(result.structuredContent.risks).toEqual([
      expect.objectContaining({ itemName: '菠菜', riskLevel: 'expired', daysUntilExpiry: -4 })
    ]);
  });

  it('returns recent meals and planned consumptions with execution state', async () => {
    const reader = createReader();
    const handlers = registerToolsFor(reader);

    const meals = await callTool(handlers, 'list_recent_meals', { family_id: familyId, limit: 1 });
    const consumptions = await callTool(handlers, 'list_pending_planned_consumptions', {
      family_id: familyId,
      from_date: '2026-09-01',
      to_date: '2026-09-30',
      limit: 1
    });

    expect(reader.listRecentMeals).toHaveBeenCalledWith({ familyId, limit: 1 });
    expect(reader.listPendingPlannedConsumptions).toHaveBeenCalledWith({
      familyId,
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
      limit: 1
    });
    expect(meals.structuredContent.count).toBe(1);
    expect(consumptions.structuredContent.consumptions).toEqual([
      expect.objectContaining({ itemName: '菠菜', mealEventId: '88888888-8888-8888-8888-888888888881' })
    ]);
  });

  it('summarizes and truncates meal feedback rows', async () => {
    const reader = createReader();
    const handlers = registerToolsFor(reader);

    const result = await callTool(handlers, 'get_meal_feedback_summary', { family_id: familyId, limit: 5 });
    const summary = result.structuredContent.summary as { readonly ratings: Record<string, number>; readonly recent: readonly Record<string, unknown>[] };

    expect(reader.listMealFeedbackRows).toHaveBeenCalledWith({ familyId, limit: 5 });
    expect(summary.ratings).toEqual({ liked: 1, neutral: 0, disliked: 0, no_feedback: 0 });
    expect(summary.recent[0]?.feedbackText).toBe(`${'a'.repeat(157)}...`);
  });

  it('rejects family IDs outside the configured scope before reading state', async () => {
    const reader = createReader();
    const handlers = registerToolsFor(reader);

    await expect(callTool(handlers, 'get_current_inventory', { family_id: otherFamilyId })).rejects.toThrow(
      'family_id is not allowed'
    );
    expect(reader.getCurrentInventory).not.toHaveBeenCalled();
  });

  it('provides callable empty reader helpers for tests', async () => {
    const reader = createEmptyFamilyStateReader();

    await expect(reader.getCurrentInventory({ familyId, includeZero: false, limit: 1 })).resolves.toEqual([]);
    await expect(reader.getInventoryRiskCandidates({ familyId, asOfDate: '2026-09-28', includeLowRisk: false, limit: 1 })).resolves.toEqual([]);
    await expect(reader.listRecentMeals({ familyId, limit: 1 })).resolves.toEqual([]);
    await expect(reader.listPendingPlannedConsumptions({ familyId, limit: 1 })).resolves.toEqual([]);
    await expect(reader.listMealFeedbackRows({ familyId, limit: 1 })).resolves.toEqual([]);
  });
});
