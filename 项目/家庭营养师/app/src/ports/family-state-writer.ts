export type ToolCallStatus = 'succeeded' | 'replayed';

export type ConfirmedWriteInput = {
  readonly familyId: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly confirmed: true;
  readonly confirmationText: string;
  readonly requestId?: string;
  readonly traceId?: string;
};

export type InventoryChange = {
  readonly inventoryItemId: string;
  readonly itemName: string;
  readonly beforeQuantity: number;
  readonly afterQuantity: number;
  readonly unit: string;
};

export type PurchaseWriteItem = {
  readonly itemName: string;
  readonly category: string;
  readonly quantity: number;
  readonly unit: string;
  readonly storageLocation: string;
  readonly purchasedAt?: string;
  readonly expiresAt?: string;
  readonly unitPrice?: number;
  readonly notes?: string;
};

export type RecordPurchaseAfterConfirmationInput = ConfirmedWriteInput & {
  readonly purchasedOn: string;
  readonly source: string;
  readonly storeName?: string;
  readonly totalAmount?: number;
  readonly currency: string;
  readonly notes?: string;
  readonly items: readonly PurchaseWriteItem[];
};

export type RecordPurchaseAfterConfirmationResult = {
  readonly toolCallId: string;
  readonly status: ToolCallStatus;
  readonly purchaseRecordId: string;
  readonly inventoryChanges: readonly InventoryChange[];
};

export type MealExecutionItem = {
  readonly mealPlanItemId?: string;
  readonly recipeRef?: string;
  readonly recipeTitle: string;
  readonly actualServings?: number;
  readonly notes?: string;
};

export type MealExecutionConsumption = {
  readonly plannedConsumptionId?: string;
  readonly inventoryItemId: string;
  readonly quantity: number;
  readonly unit: string;
  readonly notes?: string;
};

export type ConfirmMealExecutionInput = ConfirmedWriteInput & {
  readonly mealPlanId?: string;
  readonly cookedAt: string;
  readonly mealScene: string;
  readonly status: 'cooked' | 'partially_cooked' | 'skipped';
  readonly notes?: string;
  readonly items: readonly MealExecutionItem[];
  readonly consumptions: readonly MealExecutionConsumption[];
};

export type ConfirmMealExecutionResult = {
  readonly toolCallId: string;
  readonly status: ToolCallStatus;
  readonly mealEventId: string;
  readonly inventoryChanges: readonly InventoryChange[];
};

export type RecordMealFeedbackInput = ConfirmedWriteInput & {
  readonly mealEventId: string;
  readonly familyMemberId?: string;
  readonly rating: 'liked' | 'neutral' | 'disliked' | 'no_feedback';
  readonly feedbackText?: string;
  readonly suggestedPreferenceUpdate?: string;
  readonly requiresHumanReview: boolean;
};

export type RecordMealFeedbackResult = {
  readonly toolCallId: string;
  readonly status: ToolCallStatus;
  readonly feedbackId: string;
  readonly requiresHumanReview: boolean;
};

export type AdjustInventoryAfterFeedbackInput = ConfirmedWriteInput & {
  readonly inventoryItemId: string;
  readonly adjustmentType: 'adjust' | 'discard' | 'expire';
  readonly quantityDelta: number;
  readonly unit: string;
  readonly reason: string;
};

export type AdjustInventoryAfterFeedbackResult = {
  readonly toolCallId: string;
  readonly status: ToolCallStatus;
  readonly inventoryItemId: string;
  readonly itemName: string;
  readonly beforeQuantity: number;
  readonly afterQuantity: number;
  readonly unit: string;
};

export type FamilyStateWriter = {
  readonly recordPurchaseAfterConfirmation: (
    input: RecordPurchaseAfterConfirmationInput
  ) => Promise<RecordPurchaseAfterConfirmationResult>;
  readonly confirmMealExecution: (input: ConfirmMealExecutionInput) => Promise<ConfirmMealExecutionResult>;
  readonly recordMealFeedback: (input: RecordMealFeedbackInput) => Promise<RecordMealFeedbackResult>;
  readonly adjustInventoryAfterFeedback: (
    input: AdjustInventoryAfterFeedbackInput
  ) => Promise<AdjustInventoryAfterFeedbackResult>;
};
