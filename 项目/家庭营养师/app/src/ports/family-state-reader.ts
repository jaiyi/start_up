export type CurrentInventoryItem = {
  readonly id: string;
  readonly familyId: string;
  readonly itemName: string;
  readonly category: string;
  readonly quantity: number;
  readonly unit: string;
  readonly storageLocation: string;
  readonly purchasedAt: string | null;
  readonly expiresAt: string | null;
  readonly lastEventAt: string | null;
  readonly notes: string | null;
  readonly updatedAt: string;
};

export type RecentMealItem = {
  readonly recipeRef: string | null;
  readonly recipeTitle: string;
  readonly actualServings: number | null;
};

export type RecentMeal = {
  readonly mealEventId: string;
  readonly mealPlanId: string | null;
  readonly cookedAt: string;
  readonly mealScene: string;
  readonly status: string;
  readonly notes: string | null;
  readonly items: readonly RecentMealItem[];
};

export type PendingPlannedConsumption = {
  readonly plannedConsumptionId: string;
  readonly mealPlanId: string;
  readonly mealPlanItemId: string;
  readonly planDate: string;
  readonly mealScene: string;
  readonly planStatus: string;
  readonly recipeRef: string | null;
  readonly recipeTitle: string;
  readonly dishRole: string;
  readonly inventoryItemId: string | null;
  readonly itemName: string;
  readonly plannedQuantity: number;
  readonly unit: string;
  readonly inventoryQuantity: number | null;
  readonly storageLocation: string | null;
  readonly expiresAt: string | null;
  readonly mealEventId: string | null;
  readonly notes: string | null;
};

export type MealFeedbackRow = {
  readonly feedbackId: string;
  readonly mealEventId: string;
  readonly cookedAt: string;
  readonly mealScene: string;
  readonly rating: 'liked' | 'neutral' | 'disliked' | 'no_feedback';
  readonly feedbackText: string | null;
  readonly suggestedPreferenceUpdate: string | null;
  readonly requiresHumanReview: boolean;
  readonly familyMemberName: string | null;
  readonly familyMemberRole: string | null;
  readonly recipeTitles: readonly string[];
  readonly createdAt: string;
};

export type GetCurrentInventoryInput = {
  readonly familyId: string;
  readonly includeZero: boolean;
  readonly limit: number;
};

export type GetInventoryRiskCandidatesInput = {
  readonly familyId: string;
  readonly asOfDate: string;
  readonly includeLowRisk: boolean;
  readonly limit: number;
};

export type ListRecentMealsInput = {
  readonly familyId: string;
  readonly limit: number;
};

export type ListPendingPlannedConsumptionsInput = {
  readonly familyId: string;
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly limit: number;
};

export type ListMealFeedbackRowsInput = {
  readonly familyId: string;
  readonly limit: number;
};

export type FamilyStateReader = {
  readonly getCurrentInventory: (input: GetCurrentInventoryInput) => Promise<readonly CurrentInventoryItem[]>;
  readonly getInventoryRiskCandidates: (input: GetInventoryRiskCandidatesInput) => Promise<readonly CurrentInventoryItem[]>;
  readonly listRecentMeals: (input: ListRecentMealsInput) => Promise<readonly RecentMeal[]>;
  readonly listPendingPlannedConsumptions: (
    input: ListPendingPlannedConsumptionsInput
  ) => Promise<readonly PendingPlannedConsumption[]>;
  readonly listMealFeedbackRows: (input: ListMealFeedbackRowsInput) => Promise<readonly MealFeedbackRow[]>;
};
