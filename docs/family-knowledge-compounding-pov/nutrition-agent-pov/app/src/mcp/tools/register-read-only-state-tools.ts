import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildInventoryRisks } from '../../domain/inventory-risk.js';
import type { FamilyStateReader, MealFeedbackRow } from '../../ports/family-state-reader.js';
import { assertFamilyAllowed, type FamilyScope } from '../family-scope.js';
import {
  currentInventoryInputSchema,
  inventoryRisksInputSchema,
  mealFeedbackSummaryInputSchema,
  pendingPlannedConsumptionsInputSchema,
  recentMealsInputSchema
} from '../schemas/read-only-state-schemas.js';

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

const toToolResult = (structuredContent: Record<string, unknown>) => ({
  structuredContent,
  content: [{ type: 'text' as const, text: JSON.stringify(structuredContent) }]
});

const truncateFeedbackText = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  return value.length > 160 ? `${value.slice(0, 157)}...` : value;
};

const summarizeRatings = (rows: readonly MealFeedbackRow[]) =>
  rows.reduce(
    (summary, row) => ({
      ...summary,
      [row.rating]: summary[row.rating] + 1
    }),
    { liked: 0, neutral: 0, disliked: 0, no_feedback: 0 }
  );

const summarizeFeedback = (rows: readonly MealFeedbackRow[]) => ({
  total: rows.length,
  ratings: summarizeRatings(rows),
  requiresHumanReview: rows.filter((row) => row.requiresHumanReview).length,
  recent: rows.map((row) => ({
    feedbackId: row.feedbackId,
    mealEventId: row.mealEventId,
    cookedAt: row.cookedAt,
    mealScene: row.mealScene,
    rating: row.rating,
    feedbackText: truncateFeedbackText(row.feedbackText),
    suggestedPreferenceUpdate: truncateFeedbackText(row.suggestedPreferenceUpdate),
    requiresHumanReview: row.requiresHumanReview,
    familyMemberName: row.familyMemberName,
    familyMemberRole: row.familyMemberRole,
    recipeTitles: row.recipeTitles,
    createdAt: row.createdAt
  }))
});

export const registerReadOnlyStateTools = (server: McpServer, familyStateReader: FamilyStateReader, familyScope: FamilyScope): void => {
  server.registerTool(
    'get_current_inventory',
    {
      title: 'Get current inventory',
      description: 'Returns active inventory items for a family from the Family Nutrition state database.',
      inputSchema: currentInventoryInputSchema,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async (input) => {
      const parsedInput = currentInventoryInputSchema.parse(input);
      assertFamilyAllowed(familyScope, parsedInput.family_id);
      const items = await familyStateReader.getCurrentInventory({
        familyId: parsedInput.family_id,
        includeZero: parsedInput.include_zero,
        limit: parsedInput.limit
      });

      return toToolResult({ familyId: parsedInput.family_id, count: items.length, items });
    }
  );

  server.registerTool(
    'get_inventory_risks',
    {
      title: 'Get inventory risks',
      description: 'Returns expired, expiring, aging, and overstock risk signals for current inventory.',
      inputSchema: inventoryRisksInputSchema,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async (input) => {
      const parsedInput = inventoryRisksInputSchema.parse(input);
      assertFamilyAllowed(familyScope, parsedInput.family_id);
      const items = await familyStateReader.getInventoryRiskCandidates({
        familyId: parsedInput.family_id,
        asOfDate: parsedInput.as_of_date,
        includeLowRisk: parsedInput.include_low_risk,
        limit: parsedInput.limit
      });
      const risks = buildInventoryRisks(items, {
        asOfDate: parsedInput.as_of_date,
        includeLowRisk: parsedInput.include_low_risk,
        limit: parsedInput.limit
      });

      return toToolResult({ familyId: parsedInput.family_id, asOfDate: parsedInput.as_of_date, count: risks.length, risks });
    }
  );

  server.registerTool(
    'list_recent_meals',
    {
      title: 'List recent meals',
      description: 'Returns recent cooked meal records and their dish items for a family.',
      inputSchema: recentMealsInputSchema,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async (input) => {
      const parsedInput = recentMealsInputSchema.parse(input);
      assertFamilyAllowed(familyScope, parsedInput.family_id);
      const meals = await familyStateReader.listRecentMeals({ familyId: parsedInput.family_id, limit: parsedInput.limit });

      return toToolResult({ familyId: parsedInput.family_id, count: meals.length, meals });
    }
  );

  server.registerTool(
    'list_pending_planned_consumptions',
    {
      title: 'List pending planned consumptions',
      description: 'Returns planned ingredient consumptions with execution state for meal plans.',
      inputSchema: pendingPlannedConsumptionsInputSchema,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async (input) => {
      const parsedInput = pendingPlannedConsumptionsInputSchema.parse(input);
      assertFamilyAllowed(familyScope, parsedInput.family_id);
      const consumptions = await familyStateReader.listPendingPlannedConsumptions({
        familyId: parsedInput.family_id,
        ...(parsedInput.from_date ? { fromDate: parsedInput.from_date } : {}),
        ...(parsedInput.to_date ? { toDate: parsedInput.to_date } : {}),
        limit: parsedInput.limit
      });

      return toToolResult({ familyId: parsedInput.family_id, count: consumptions.length, consumptions });
    }
  );

  server.registerTool(
    'get_meal_feedback_summary',
    {
      title: 'Get meal feedback summary',
      description: 'Returns summarized meal feedback signals and recent review items for a family.',
      inputSchema: mealFeedbackSummaryInputSchema,
      annotations: READ_ONLY_ANNOTATIONS
    },
    async (input) => {
      const parsedInput = mealFeedbackSummaryInputSchema.parse(input);
      assertFamilyAllowed(familyScope, parsedInput.family_id);
      const rows = await familyStateReader.listMealFeedbackRows({ familyId: parsedInput.family_id, limit: parsedInput.limit });

      return toToolResult({ familyId: parsedInput.family_id, summary: summarizeFeedback(rows) });
    }
  );
};
