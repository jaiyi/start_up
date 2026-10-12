import type { QueryResult, QueryResultRow } from 'pg';
import type {
  CurrentInventoryItem,
  FamilyStateReader,
  MealFeedbackRow,
  PendingPlannedConsumption,
  RecentMeal,
  RecentMealItem
} from '../../ports/family-state-reader.js';

type QueryablePool = {
  readonly query: <T extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]) => Promise<QueryResult<T>>;
};

type CurrentInventoryRow = QueryResultRow & {
  readonly id: string;
  readonly family_id: string;
  readonly item_name: string;
  readonly category: string;
  readonly quantity: string | number;
  readonly unit: string;
  readonly storage_location: string;
  readonly purchased_at: Date | string | null;
  readonly expires_at: Date | string | null;
  readonly last_event_at: Date | string | null;
  readonly notes: string | null;
  readonly updated_at: Date | string;
};

type RecentMealItemRow = {
  readonly recipe_ref?: string | null;
  readonly recipe_title?: string;
  readonly actual_servings?: string | number | null;
};

type RecentMealRow = QueryResultRow & {
  readonly meal_event_id: string;
  readonly meal_plan_id: string | null;
  readonly cooked_at: Date | string;
  readonly meal_scene: string;
  readonly status: string;
  readonly notes: string | null;
  readonly items: unknown;
};

type PendingPlannedConsumptionRow = QueryResultRow & {
  readonly planned_consumption_id: string;
  readonly meal_plan_id: string;
  readonly meal_plan_item_id: string;
  readonly plan_date: Date | string;
  readonly meal_scene: string;
  readonly plan_status: string;
  readonly recipe_ref: string | null;
  readonly recipe_title: string;
  readonly dish_role: string;
  readonly inventory_item_id: string | null;
  readonly item_name: string;
  readonly planned_quantity: string | number;
  readonly unit: string;
  readonly inventory_quantity: string | number | null;
  readonly storage_location: string | null;
  readonly expires_at: Date | string | null;
  readonly meal_event_id: string | null;
  readonly notes: string | null;
};

type MealFeedbackRowResult = QueryResultRow & {
  readonly feedback_id: string;
  readonly meal_event_id: string;
  readonly cooked_at: Date | string;
  readonly meal_scene: string;
  readonly rating: 'liked' | 'neutral' | 'disliked' | 'no_feedback';
  readonly feedback_text: string | null;
  readonly suggested_preference_update: string | null;
  readonly requires_human_review: boolean;
  readonly family_member_name: string | null;
  readonly family_member_role: string | null;
  readonly recipe_titles: unknown;
  readonly created_at: Date | string;
};

const CURRENT_INVENTORY_QUERY = `
  SELECT *
  FROM family_state.read_current_inventory($1::uuid, $2::boolean, $3::integer)
`;

const INVENTORY_RISK_CANDIDATES_QUERY = `
  SELECT *
  FROM family_state.read_inventory_risk_candidates($1::uuid, $2::date, $3::boolean, $4::integer)
`;

const RECENT_MEALS_QUERY = `
  SELECT *
  FROM family_state.read_recent_meals($1::uuid, $2::integer)
`;

const PENDING_PLANNED_CONSUMPTIONS_QUERY = `
  SELECT *
  FROM family_state.read_pending_planned_consumptions($1::uuid, $2::date, $3::date, $4::integer)
`;

const MEAL_FEEDBACK_ROWS_QUERY = `
  SELECT *
  FROM family_state.read_meal_feedback_rows($1::uuid, $2::integer)
`;

const toNumber = (value: string | number | null): number | null => (value === null ? null : Number(value));

const toIsoDate = (value: Date | string | null): string | null => {
  if (value === null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
};

const toIsoDateTime = (value: Date | string): string => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());

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

const toRecentMealItem = (item: RecentMealItemRow): RecentMealItem => ({
  recipeRef: item.recipe_ref ?? null,
  recipeTitle: item.recipe_title ?? '',
  actualServings: toNumber(item.actual_servings ?? null) ?? null
});

const toCurrentInventoryItem = (row: CurrentInventoryRow): CurrentInventoryItem => ({
  id: row.id,
  familyId: row.family_id,
  itemName: row.item_name,
  category: row.category,
  quantity: Number(row.quantity),
  unit: row.unit,
  storageLocation: row.storage_location,
  purchasedAt: toIsoDate(row.purchased_at),
  expiresAt: toIsoDate(row.expires_at),
  lastEventAt: row.last_event_at ? toIsoDateTime(row.last_event_at) : null,
  notes: row.notes,
  updatedAt: toIsoDateTime(row.updated_at)
});

const toRecentMeal = (row: RecentMealRow): RecentMeal => ({
  mealEventId: row.meal_event_id,
  mealPlanId: row.meal_plan_id,
  cookedAt: toIsoDateTime(row.cooked_at),
  mealScene: row.meal_scene,
  status: row.status,
  notes: row.notes,
  items: parseJsonArray<RecentMealItemRow>(row.items).map(toRecentMealItem)
});

const toPendingPlannedConsumption = (row: PendingPlannedConsumptionRow): PendingPlannedConsumption => ({
  plannedConsumptionId: row.planned_consumption_id,
  mealPlanId: row.meal_plan_id,
  mealPlanItemId: row.meal_plan_item_id,
  planDate: toIsoDate(row.plan_date) ?? '',
  mealScene: row.meal_scene,
  planStatus: row.plan_status,
  recipeRef: row.recipe_ref,
  recipeTitle: row.recipe_title,
  dishRole: row.dish_role,
  inventoryItemId: row.inventory_item_id,
  itemName: row.item_name,
  plannedQuantity: Number(row.planned_quantity),
  unit: row.unit,
  inventoryQuantity: toNumber(row.inventory_quantity),
  storageLocation: row.storage_location,
  expiresAt: toIsoDate(row.expires_at),
  mealEventId: row.meal_event_id,
  notes: row.notes
});

const toMealFeedbackRow = (row: MealFeedbackRowResult): MealFeedbackRow => ({
  feedbackId: row.feedback_id,
  mealEventId: row.meal_event_id,
  cookedAt: toIsoDateTime(row.cooked_at),
  mealScene: row.meal_scene,
  rating: row.rating,
  feedbackText: row.feedback_text,
  suggestedPreferenceUpdate: row.suggested_preference_update,
  requiresHumanReview: row.requires_human_review,
  familyMemberName: row.family_member_name,
  familyMemberRole: row.family_member_role,
  recipeTitles: parseJsonArray<string>(row.recipe_titles),
  createdAt: toIsoDateTime(row.created_at)
});

export const createPostgresFamilyStateReader = (pool: QueryablePool): FamilyStateReader => ({
  getCurrentInventory: async (input) => {
    const result = await pool.query<CurrentInventoryRow>(CURRENT_INVENTORY_QUERY, [
      input.familyId,
      input.includeZero,
      input.limit
    ]);

    return result.rows.map(toCurrentInventoryItem);
  },
  getInventoryRiskCandidates: async (input) => {
    const result = await pool.query<CurrentInventoryRow>(INVENTORY_RISK_CANDIDATES_QUERY, [
      input.familyId,
      input.asOfDate,
      input.includeLowRisk,
      input.limit
    ]);

    return result.rows.map(toCurrentInventoryItem);
  },
  listRecentMeals: async (input) => {
    const result = await pool.query<RecentMealRow>(RECENT_MEALS_QUERY, [input.familyId, input.limit]);

    return result.rows.map(toRecentMeal);
  },
  listPendingPlannedConsumptions: async (input) => {
    const result = await pool.query<PendingPlannedConsumptionRow>(PENDING_PLANNED_CONSUMPTIONS_QUERY, [
      input.familyId,
      input.fromDate ?? null,
      input.toDate ?? null,
      input.limit
    ]);

    return result.rows.map(toPendingPlannedConsumption);
  },
  listMealFeedbackRows: async (input) => {
    const result = await pool.query<MealFeedbackRowResult>(MEAL_FEEDBACK_ROWS_QUERY, [input.familyId, input.limit]);

    return result.rows.map(toMealFeedbackRow);
  }
});
