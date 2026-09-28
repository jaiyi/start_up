import { z } from 'zod';

const uuidSchema = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
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
const isoDateSchema = z.string().refine(isValidIsoDate, { message: 'Expected a valid ISO calendar date in YYYY-MM-DD format' });
const limitSchema = z.number().int().min(1).max(100).default(50);

const createDateWindowSchema = <TShape extends z.ZodRawShape>(shape: TShape) =>
  z
    .object(shape)
    .refine(
      (value) =>
        !('from_date' in value) ||
        !('to_date' in value) ||
        !value.from_date ||
        !value.to_date ||
        String(value.from_date) <= String(value.to_date),
      { message: 'from_date must be earlier than or equal to to_date' }
    );

export const currentInventoryInputSchema = z.object({
  family_id: uuidSchema,
  include_zero: z.boolean().default(false),
  limit: limitSchema
});

export const inventoryRisksInputSchema = z.object({
  family_id: uuidSchema,
  as_of_date: isoDateSchema.default(() => new Date().toISOString().slice(0, 10)),
  include_low_risk: z.boolean().default(false),
  limit: limitSchema
});

export const recentMealsInputSchema = z.object({
  family_id: uuidSchema,
  limit: z.number().int().min(1).max(100).default(20)
});

export const pendingPlannedConsumptionsInputSchema = createDateWindowSchema({
  family_id: uuidSchema,
  from_date: isoDateSchema.optional(),
  to_date: isoDateSchema.optional(),
  limit: limitSchema
});

export const mealFeedbackSummaryInputSchema = z.object({
  family_id: uuidSchema,
  limit: limitSchema
});
