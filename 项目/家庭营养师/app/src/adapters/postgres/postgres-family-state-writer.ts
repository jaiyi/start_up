import type { QueryResult, QueryResultRow } from 'pg';
import type {
  AdjustInventoryAfterFeedbackResult,
  ConfirmMealExecutionResult,
  FamilyStateWriter,
  InventoryChange,
  RecordMealFeedbackResult,
  RecordPurchaseAfterConfirmationResult,
  ToolCallStatus
} from '../../ports/family-state-writer.js';

type QueryablePool = {
  readonly query: <T extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]) => Promise<QueryResult<T>>;
};

type InventoryChangeRow = {
  readonly inventory_item_id?: string;
  readonly item_name?: string;
  readonly before_quantity?: string | number;
  readonly after_quantity?: string | number;
  readonly unit?: string;
};

type PurchaseResultRow = QueryResultRow & {
  readonly tool_call_id: string;
  readonly call_status: ToolCallStatus;
  readonly purchase_record_id: string;
  readonly inventory_changes: unknown;
};

type MealExecutionResultRow = QueryResultRow & {
  readonly tool_call_id: string;
  readonly call_status: ToolCallStatus;
  readonly meal_event_id: string;
  readonly inventory_changes: unknown;
};

type FeedbackResultRow = QueryResultRow & {
  readonly tool_call_id: string;
  readonly call_status: ToolCallStatus;
  readonly feedback_id: string;
  readonly requires_human_review: boolean;
};

type AdjustmentResultRow = QueryResultRow & {
  readonly tool_call_id: string;
  readonly call_status: ToolCallStatus;
  readonly inventory_item_id: string;
  readonly item_name: string;
  readonly before_quantity: string | number;
  readonly after_quantity: string | number;
  readonly unit: string;
};

const RECORD_PURCHASE_QUERY = `
  SELECT *
  FROM family_state.record_purchase_after_confirmation($1::uuid, $2::uuid, $3::jsonb)
`;

const CONFIRM_MEAL_EXECUTION_QUERY = `
  SELECT *
  FROM family_state.confirm_meal_execution($1::uuid, $2::uuid, $3::jsonb)
`;

const RECORD_MEAL_FEEDBACK_QUERY = `
  SELECT *
  FROM family_state.record_meal_feedback($1::uuid, $2::uuid, $3::jsonb)
`;

const ADJUST_INVENTORY_QUERY = `
  SELECT *
  FROM family_state.adjust_inventory_after_feedback($1::uuid, $2::uuid, $3::jsonb)
`;

const parseJsonArray = <T>(value: unknown): readonly T[] => {
  if (Array.isArray(value)) {
    return value as readonly T[];
  }
  if (typeof value === 'string') {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as readonly T[]) : [];
  }

  return [];
};

const toInventoryChange = (row: InventoryChangeRow): InventoryChange => ({
  inventoryItemId: row.inventory_item_id ?? '',
  itemName: row.item_name ?? '',
  beforeQuantity: Number(row.before_quantity ?? 0),
  afterQuantity: Number(row.after_quantity ?? 0),
  unit: row.unit ?? ''
});

const toPayload = (input: Record<string, unknown>): Record<string, unknown> => ({ ...input });

const requiredRow = <TRow>(row: TRow | undefined, functionName: string): TRow => {
  if (!row) {
    throw new Error(`${functionName} returned no rows`);
  }

  return row;
};

const toPurchaseResult = (row: PurchaseResultRow): RecordPurchaseAfterConfirmationResult => ({
  toolCallId: row.tool_call_id,
  status: row.call_status,
  purchaseRecordId: row.purchase_record_id,
  inventoryChanges: parseJsonArray<InventoryChangeRow>(row.inventory_changes).map(toInventoryChange)
});

const toMealExecutionResult = (row: MealExecutionResultRow): ConfirmMealExecutionResult => ({
  toolCallId: row.tool_call_id,
  status: row.call_status,
  mealEventId: row.meal_event_id,
  inventoryChanges: parseJsonArray<InventoryChangeRow>(row.inventory_changes).map(toInventoryChange)
});

const toFeedbackResult = (row: FeedbackResultRow): RecordMealFeedbackResult => ({
  toolCallId: row.tool_call_id,
  status: row.call_status,
  feedbackId: row.feedback_id,
  requiresHumanReview: row.requires_human_review
});

const toAdjustmentResult = (row: AdjustmentResultRow): AdjustInventoryAfterFeedbackResult => ({
  toolCallId: row.tool_call_id,
  status: row.call_status,
  inventoryItemId: row.inventory_item_id,
  itemName: row.item_name,
  beforeQuantity: Number(row.before_quantity),
  afterQuantity: Number(row.after_quantity),
  unit: row.unit
});

export const createPostgresFamilyStateWriter = (pool: QueryablePool): FamilyStateWriter => ({
  recordPurchaseAfterConfirmation: async (input) => {
    const result = await pool.query<PurchaseResultRow>(RECORD_PURCHASE_QUERY, [input.familyId, input.actorId, toPayload(input)]);

    return toPurchaseResult(requiredRow(result.rows[0], 'record_purchase_after_confirmation'));
  },
  confirmMealExecution: async (input) => {
    const result = await pool.query<MealExecutionResultRow>(CONFIRM_MEAL_EXECUTION_QUERY, [input.familyId, input.actorId, toPayload(input)]);

    return toMealExecutionResult(requiredRow(result.rows[0], 'confirm_meal_execution'));
  },
  recordMealFeedback: async (input) => {
    const result = await pool.query<FeedbackResultRow>(RECORD_MEAL_FEEDBACK_QUERY, [input.familyId, input.actorId, toPayload(input)]);

    return toFeedbackResult(requiredRow(result.rows[0], 'record_meal_feedback'));
  },
  adjustInventoryAfterFeedback: async (input) => {
    const result = await pool.query<AdjustmentResultRow>(ADJUST_INVENTORY_QUERY, [input.familyId, input.actorId, toPayload(input)]);

    return toAdjustmentResult(requiredRow(result.rows[0], 'adjust_inventory_after_feedback'));
  }
});
