import type { CurrentInventoryItem } from '../ports/family-state-reader.js';

export type InventoryRiskLevel = 'expired' | 'high' | 'medium' | 'low';

export type InventoryRiskReason = 'expired' | 'expiring_soon' | 'aging_stock' | 'possible_overstock' | 'no_immediate_risk';

export type InventoryRisk = {
  readonly itemId: string;
  readonly itemName: string;
  readonly category: string;
  readonly quantity: number;
  readonly unit: string;
  readonly storageLocation: string;
  readonly expiresAt: string | null;
  readonly daysUntilExpiry: number | null;
  readonly riskLevel: InventoryRiskLevel;
  readonly riskReasons: readonly InventoryRiskReason[];
  readonly priorityScore: number;
};

export type BuildInventoryRisksOptions = {
  readonly asOfDate: string;
  readonly includeLowRisk?: boolean;
  readonly limit?: number;
};

const EXPIRING_SOON_DAYS = 3;
const AGING_STOCK_DAYS = 14;
const POSSIBLE_OVERSTOCK_QUANTITY = 1000;
const DEFAULT_LIMIT = 50;

const dayInMs = 24 * 60 * 60 * 1000;

const parseDateOnly = (date: string): number => new Date(`${date}T00:00:00.000Z`).getTime();

const daysBetween = (fromDate: string, toDate: string): number => Math.round((parseDateOnly(toDate) - parseDateOnly(fromDate)) / dayInMs);

const getAgeDays = (item: CurrentInventoryItem, asOfDate: string): number | null =>
  item.purchasedAt ? daysBetween(item.purchasedAt, asOfDate) : null;

const getRiskReasons = (item: CurrentInventoryItem, asOfDate: string): readonly InventoryRiskReason[] => {
  const daysUntilExpiry = item.expiresAt ? daysBetween(asOfDate, item.expiresAt) : null;
  const ageDays = getAgeDays(item, asOfDate);
  const expiryReasons: readonly InventoryRiskReason[] =
    daysUntilExpiry === null ? [] : daysUntilExpiry < 0 ? ['expired'] : daysUntilExpiry <= EXPIRING_SOON_DAYS ? ['expiring_soon'] : [];
  const agingReasons: readonly InventoryRiskReason[] = ageDays !== null && ageDays >= AGING_STOCK_DAYS ? ['aging_stock'] : [];
  const overstockReasons: readonly InventoryRiskReason[] =
    item.quantity >= POSSIBLE_OVERSTOCK_QUANTITY && expiryReasons.length > 0 ? ['possible_overstock'] : [];
  const reasons = [...expiryReasons, ...agingReasons, ...overstockReasons];

  return reasons.length > 0 ? reasons : ['no_immediate_risk'];
};

const getRiskLevel = (reasons: readonly InventoryRiskReason[]): InventoryRiskLevel => {
  if (reasons.includes('expired')) {
    return 'expired';
  }
  if (reasons.includes('expiring_soon') && reasons.includes('possible_overstock')) {
    return 'high';
  }
  if (reasons.includes('expiring_soon')) {
    return 'high';
  }
  if (reasons.includes('aging_stock')) {
    return 'medium';
  }

  return 'low';
};

const getPriorityScore = (level: InventoryRiskLevel, reasons: readonly InventoryRiskReason[]): number => {
  const baseScore = {
    expired: 100,
    high: 80,
    medium: 50,
    low: 10
  }[level];

  return baseScore + reasons.filter((reason) => reason !== 'no_immediate_risk').length;
};

export const buildInventoryRisks = (
  items: readonly CurrentInventoryItem[],
  options: BuildInventoryRisksOptions
): readonly InventoryRisk[] => {
  const limit = options.limit ?? DEFAULT_LIMIT;

  return [...items]
    .map((item): InventoryRisk => {
      const daysUntilExpiry = item.expiresAt ? daysBetween(options.asOfDate, item.expiresAt) : null;
      const riskReasons = getRiskReasons(item, options.asOfDate);
      const riskLevel = getRiskLevel(riskReasons);

      return {
        itemId: item.id,
        itemName: item.itemName,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        storageLocation: item.storageLocation,
        expiresAt: item.expiresAt,
        daysUntilExpiry,
        riskLevel,
        riskReasons,
        priorityScore: getPriorityScore(riskLevel, riskReasons)
      };
    })
    .filter((risk) => options.includeLowRisk || risk.riskLevel !== 'low')
    .sort((left, right) => right.priorityScore - left.priorityScore || left.itemName.localeCompare(right.itemName))
    .slice(0, limit);
};
