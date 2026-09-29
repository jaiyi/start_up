import { describe, expect, it } from 'vitest';
import { buildInventoryRisks } from '../../src/domain/inventory-risk.js';
import type { CurrentInventoryItem } from '../../src/ports/family-state-reader.js';

const baseItem: CurrentInventoryItem = {
  id: '44444444-4444-4444-4444-444444444441',
  familyId: '11111111-1111-1111-1111-111111111111',
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

describe('Milestone 3 inventory risk domain logic', () => {
  it('marks expired inventory as the highest risk', () => {
    const risks = buildInventoryRisks([baseItem], { asOfDate: '2026-09-28' });

    expect(risks[0]).toEqual(
      expect.objectContaining({
        itemId: baseItem.id,
        riskLevel: 'expired',
        daysUntilExpiry: -4
      })
    );
    expect(risks[0]?.riskReasons).toContain('expired');
  });

  it('marks inventory expiring within the warning window as high risk', () => {
    const risks = buildInventoryRisks([{ ...baseItem, expiresAt: '2026-09-29' }], { asOfDate: '2026-09-28' });

    expect(risks[0]?.riskLevel).toBe('high');
    expect(risks[0]?.riskReasons).toContain('expiring_soon');
  });

  it('returns low risk for stable pantry inventory', () => {
    const risks = buildInventoryRisks(
      [
        {
          ...baseItem,
          itemName: '大米',
          category: 'staple',
          storageLocation: 'pantry',
          purchasedAt: '2026-09-20',
          expiresAt: '2026-12-31'
        }
      ],
      { asOfDate: '2026-09-28', includeLowRisk: true }
    );

    expect(risks[0]?.riskLevel).toBe('low');
    expect(risks[0]?.riskReasons).toEqual(['no_immediate_risk']);
  });

  it('does not mutate the inventory input objects', () => {
    const items = [baseItem];
    const before = JSON.stringify(items);

    buildInventoryRisks(items, { asOfDate: '2026-09-28' });

    expect(JSON.stringify(items)).toBe(before);
  });
});
