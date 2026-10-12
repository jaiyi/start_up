import { z } from 'zod';

const uuidSchema = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
const nonEmptyTextSchema = z.string().trim().min(1).max(500);
const optionalTextSchema = z.string().trim().min(1).max(1000).optional();
const idempotencyKeySchema = z.string().trim().min(1).max(160);
const quantitySchema = z.number().positive().max(1_000_000);
const signedQuantitySchema = z.number().min(-1_000_000).max(1_000_000).refine((value) => value !== 0, {
  message: 'quantity_delta must not be zero'
});

const isValidIsoDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const isValidIsoDateTime = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return false;
  }

  const datePart = value.slice(0, 10);
  if (!isValidIsoDate(datePart)) {
    return false;
  }

  const parsed = new Date(value);

  return !Number.isNaN(parsed.getTime());
};

const isoDateSchema = z.string().refine(isValidIsoDate, { message: 'Expected a valid ISO calendar date in YYYY-MM-DD format' });
const isoDateTimeSchema = z.string().refine(isValidIsoDateTime, { message: 'Expected a valid ISO datetime string' });

const confirmedWriteSchema = z.object({
  family_id: uuidSchema,
  actor_id: uuidSchema,
  idempotency_key: idempotencyKeySchema,
  confirmed: z.literal(true),
  confirmation_text: nonEmptyTextSchema,
  request_id: z.string().trim().min(1).max(160).optional(),
  trace_id: z.string().trim().min(1).max(160).optional()
});

const inventoryCategorySchema = z.enum(['vegetable', 'protein', 'staple', 'fruit', 'dairy', 'seasoning', 'frozen', 'other']);
const storageLocationSchema = z.enum(['fridge', 'freezer', 'pantry', 'room_temperature', 'unknown']);
const mealSceneSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'baby_meal']);

const purchaseItemSchema = z
  .object({
    item_name: nonEmptyTextSchema,
    category: inventoryCategorySchema,
    quantity: quantitySchema,
    unit: nonEmptyTextSchema,
    storage_location: storageLocationSchema,
    purchased_at: isoDateSchema.optional(),
    expires_at: isoDateSchema.optional(),
    unit_price: z.number().nonnegative().max(1_000_000).optional(),
    notes: optionalTextSchema
  })
  .refine((value) => !value.purchased_at || !value.expires_at || value.purchased_at <= value.expires_at, {
    message: 'expires_at must be later than or equal to purchased_at'
  });

export const recordPurchaseAfterConfirmationInputSchema = confirmedWriteSchema
  .extend({
    purchased_on: isoDateSchema,
    source: z.enum(['manual', 'receipt', 'agent_suggestion', 'import']).default('manual'),
    store_name: z.string().trim().min(1).max(200).optional(),
    total_amount: z.number().nonnegative().max(1_000_000).optional(),
    currency: z.string().trim().length(3).default('CNY'),
    notes: optionalTextSchema,
    items: z.array(purchaseItemSchema).min(1).max(50)
  })
  .transform((value) => ({
    ...value,
    items: value.items.map((item) => ({ ...item, purchased_at: item.purchased_at ?? value.purchased_on }))
  }));

export const confirmMealExecutionInputSchema = confirmedWriteSchema
  .extend({
    meal_plan_id: uuidSchema.optional(),
    cooked_at: isoDateTimeSchema,
    meal_scene: mealSceneSchema,
    status: z.enum(['cooked', 'partially_cooked', 'skipped']),
    notes: optionalTextSchema,
    items: z
      .array(
        z.object({
          meal_plan_item_id: uuidSchema.optional(),
          recipe_ref: z.string().trim().min(1).max(500).optional(),
          recipe_title: nonEmptyTextSchema,
          actual_servings: z.number().positive().max(100).optional(),
          notes: optionalTextSchema
        })
      )
      .min(1)
      .max(30),
    consumptions: z
      .array(
        z.object({
          planned_consumption_id: uuidSchema.optional(),
          inventory_item_id: uuidSchema,
          quantity: quantitySchema,
          unit: nonEmptyTextSchema,
          notes: optionalTextSchema
        })
      )
      .max(50)
  })
  .refine((value) => value.status === 'skipped' || value.consumptions.length > 0, {
    message: 'cooked meals require at least one consumption'
  });

export const recordMealFeedbackInputSchema = confirmedWriteSchema.extend({
  meal_event_id: uuidSchema,
  family_member_id: uuidSchema.optional(),
  rating: z.enum(['liked', 'neutral', 'disliked', 'no_feedback']),
  feedback_text: optionalTextSchema,
  suggested_preference_update: optionalTextSchema,
  requires_human_review: z.boolean().default(false)
});

export const adjustInventoryAfterFeedbackInputSchema = confirmedWriteSchema
  .extend({
    inventory_item_id: uuidSchema,
    adjustment_type: z.enum(['adjust', 'discard', 'expire']),
    quantity_delta: signedQuantitySchema,
    unit: nonEmptyTextSchema,
    reason: nonEmptyTextSchema
  })
  .refine((value) => value.adjustment_type === 'adjust' || value.quantity_delta < 0, {
    message: 'discard and expire adjustments must reduce inventory'
  });
