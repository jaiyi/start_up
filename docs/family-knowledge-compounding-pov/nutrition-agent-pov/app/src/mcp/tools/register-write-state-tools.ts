import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  AdjustInventoryAfterFeedbackInput,
  ConfirmMealExecutionInput,
  FamilyStateWriter,
  RecordMealFeedbackInput,
  RecordPurchaseAfterConfirmationInput
} from '../../ports/family-state-writer.js';
import { assertFamilyAllowed, type FamilyScope } from '../family-scope.js';
import {
  adjustInventoryAfterFeedbackInputSchema,
  confirmMealExecutionInputSchema,
  recordMealFeedbackInputSchema,
  recordPurchaseAfterConfirmationInputSchema
} from '../schemas/write-state-schemas.js';

const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

const DESTRUCTIVE_WRITE_ANNOTATIONS = {
  ...WRITE_ANNOTATIONS,
  destructiveHint: true
} as const;

const toToolResult = (structuredContent: Record<string, unknown>) => ({
  structuredContent,
  content: [{ type: 'text' as const, text: JSON.stringify(structuredContent) }]
});

const optional = <TValue>(value: TValue | undefined, key: string): Record<string, TValue> => (value === undefined ? {} : { [key]: value });

type ParsedConfirmedWrite = {
  readonly family_id: string;
  readonly actor_id: string;
  readonly idempotency_key: string;
  readonly confirmed: true;
  readonly confirmation_text: string;
  readonly request_id?: string | undefined;
  readonly trace_id?: string | undefined;
};

const toConfirmedWriteFields = (parsedInput: ParsedConfirmedWrite) => ({
  familyId: parsedInput.family_id,
  actorId: parsedInput.actor_id,
  idempotencyKey: parsedInput.idempotency_key,
  confirmed: parsedInput.confirmed,
  confirmationText: parsedInput.confirmation_text,
  ...optional(parsedInput.request_id, 'requestId'),
  ...optional(parsedInput.trace_id, 'traceId')
});

const toPurchaseInput = (parsedInput: ReturnType<typeof recordPurchaseAfterConfirmationInputSchema.parse>): RecordPurchaseAfterConfirmationInput => ({
  ...toConfirmedWriteFields(parsedInput),
  purchasedOn: parsedInput.purchased_on,
  source: parsedInput.source,
  ...optional(parsedInput.store_name, 'storeName'),
  ...optional(parsedInput.total_amount, 'totalAmount'),
  currency: parsedInput.currency,
  ...optional(parsedInput.notes, 'notes'),
  items: parsedInput.items.map((item) => ({
    itemName: item.item_name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    storageLocation: item.storage_location,
    purchasedAt: item.purchased_at ?? parsedInput.purchased_on,
    ...optional(item.expires_at, 'expiresAt'),
    ...optional(item.unit_price, 'unitPrice'),
    ...optional(item.notes, 'notes')
  }))
});

const toMealExecutionInput = (parsedInput: ReturnType<typeof confirmMealExecutionInputSchema.parse>): ConfirmMealExecutionInput => ({
  ...toConfirmedWriteFields(parsedInput),
  ...optional(parsedInput.meal_plan_id, 'mealPlanId'),
  cookedAt: parsedInput.cooked_at,
  mealScene: parsedInput.meal_scene,
  status: parsedInput.status,
  ...optional(parsedInput.notes, 'notes'),
  items: parsedInput.items.map((item) => ({
    ...optional(item.meal_plan_item_id, 'mealPlanItemId'),
    ...optional(item.recipe_ref, 'recipeRef'),
    recipeTitle: item.recipe_title,
    ...optional(item.actual_servings, 'actualServings'),
    ...optional(item.notes, 'notes')
  })),
  consumptions: parsedInput.consumptions.map((consumption) => ({
    ...optional(consumption.planned_consumption_id, 'plannedConsumptionId'),
    inventoryItemId: consumption.inventory_item_id,
    quantity: consumption.quantity,
    unit: consumption.unit,
    ...optional(consumption.notes, 'notes')
  }))
});

const toFeedbackInput = (parsedInput: ReturnType<typeof recordMealFeedbackInputSchema.parse>): RecordMealFeedbackInput => ({
  ...toConfirmedWriteFields(parsedInput),
  mealEventId: parsedInput.meal_event_id,
  ...optional(parsedInput.family_member_id, 'familyMemberId'),
  rating: parsedInput.rating,
  ...optional(parsedInput.feedback_text, 'feedbackText'),
  ...optional(parsedInput.suggested_preference_update, 'suggestedPreferenceUpdate'),
  requiresHumanReview: parsedInput.requires_human_review
});

const toAdjustmentInput = (parsedInput: ReturnType<typeof adjustInventoryAfterFeedbackInputSchema.parse>): AdjustInventoryAfterFeedbackInput => ({
  ...toConfirmedWriteFields(parsedInput),
  inventoryItemId: parsedInput.inventory_item_id,
  adjustmentType: parsedInput.adjustment_type,
  quantityDelta: parsedInput.quantity_delta,
  unit: parsedInput.unit,
  reason: parsedInput.reason
});

export const registerWriteStateTools = (server: McpServer, familyStateWriter: FamilyStateWriter, familyScope: FamilyScope): void => {
  server.registerTool(
    'record_purchase_after_confirmation',
    {
      title: 'Record purchase after confirmation',
      description: 'Records confirmed grocery purchases, updates inventory, and writes audit/idempotency records.',
      inputSchema: recordPurchaseAfterConfirmationInputSchema,
      annotations: WRITE_ANNOTATIONS
    },
    async (input) => {
      const parsedInput = recordPurchaseAfterConfirmationInputSchema.parse(input);
      assertFamilyAllowed(familyScope, parsedInput.family_id);
      const result = await familyStateWriter.recordPurchaseAfterConfirmation(toPurchaseInput(parsedInput));

      return toToolResult({ familyId: parsedInput.family_id, ...result });
    }
  );

  server.registerTool(
    'confirm_meal_execution',
    {
      title: 'Confirm meal execution',
      description: 'Records a confirmed cooked/skipped meal and consumes inventory when applicable.',
      inputSchema: confirmMealExecutionInputSchema,
      annotations: DESTRUCTIVE_WRITE_ANNOTATIONS
    },
    async (input) => {
      const parsedInput = confirmMealExecutionInputSchema.parse(input);
      assertFamilyAllowed(familyScope, parsedInput.family_id);
      const result = await familyStateWriter.confirmMealExecution(toMealExecutionInput(parsedInput));

      return toToolResult({ familyId: parsedInput.family_id, ...result });
    }
  );

  server.registerTool(
    'record_meal_feedback',
    {
      title: 'Record meal feedback',
      description: 'Records confirmed meal feedback without directly changing markdown-backed preferences.',
      inputSchema: recordMealFeedbackInputSchema,
      annotations: WRITE_ANNOTATIONS
    },
    async (input) => {
      const parsedInput = recordMealFeedbackInputSchema.parse(input);
      assertFamilyAllowed(familyScope, parsedInput.family_id);
      const result = await familyStateWriter.recordMealFeedback(toFeedbackInput(parsedInput));

      return toToolResult({ familyId: parsedInput.family_id, ...result });
    }
  );

  server.registerTool(
    'adjust_inventory_after_feedback',
    {
      title: 'Adjust inventory after feedback',
      description: 'Applies confirmed inventory adjustments, discards, or expirations after user feedback.',
      inputSchema: adjustInventoryAfterFeedbackInputSchema,
      annotations: DESTRUCTIVE_WRITE_ANNOTATIONS
    },
    async (input) => {
      const parsedInput = adjustInventoryAfterFeedbackInputSchema.parse(input);
      assertFamilyAllowed(familyScope, parsedInput.family_id);
      const result = await familyStateWriter.adjustInventoryAfterFeedback(toAdjustmentInput(parsedInput));

      return toToolResult({ familyId: parsedInput.family_id, ...result });
    }
  );
};
