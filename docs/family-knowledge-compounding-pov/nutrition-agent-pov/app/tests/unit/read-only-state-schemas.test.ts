import { describe, expect, it } from 'vitest';
import {
  currentInventoryInputSchema,
  inventoryRisksInputSchema,
  mealFeedbackSummaryInputSchema,
  pendingPlannedConsumptionsInputSchema,
  recentMealsInputSchema
} from '../../src/mcp/schemas/read-only-state-schemas.js';

const familyId = '11111111-1111-1111-1111-111111111111';

describe('Milestone 3 read-only state MCP schemas', () => {
  it('rejects invalid family IDs at the boundary', () => {
    const result = currentInventoryInputSchema.safeParse({ family_id: 'not-a-uuid' });

    expect(result.success).toBe(false);
  });

  it('accepts defaults for current inventory reads', () => {
    const result = currentInventoryInputSchema.parse({ family_id: familyId });

    expect(result).toEqual({ family_id: familyId, include_zero: false, limit: 50 });
  });

  it('rejects limits above the bounded maximum', () => {
    const result = recentMealsInputSchema.safeParse({ family_id: familyId, limit: 101 });

    expect(result.success).toBe(false);
  });

  it('rejects invalid date windows for pending planned consumptions', () => {
    const result = pendingPlannedConsumptionsInputSchema.safeParse({
      family_id: familyId,
      from_date: '2026-10-01',
      to_date: '2026-09-01'
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid calendar dates', () => {
    const invalidDates = ['2026-02-30', '2026-13-01', '2026-00-10'];

    invalidDates.forEach((asOfDate) => {
      expect(inventoryRisksInputSchema.safeParse({ family_id: familyId, as_of_date: asOfDate }).success).toBe(false);
    });
  });

  it('validates inventory risk and feedback summary inputs', () => {
    expect(inventoryRisksInputSchema.parse({ family_id: familyId, as_of_date: '2026-09-28' })).toEqual({
      family_id: familyId,
      as_of_date: '2026-09-28',
      include_low_risk: false,
      limit: 50
    });
    expect(mealFeedbackSummaryInputSchema.parse({ family_id: familyId, limit: 5 })).toEqual({
      family_id: familyId,
      limit: 5
    });
  });
});
