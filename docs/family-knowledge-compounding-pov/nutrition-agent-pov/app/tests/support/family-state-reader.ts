import type { FamilyStateReader } from '../../src/ports/family-state-reader.js';

export const createEmptyFamilyStateReader = (): FamilyStateReader => ({
  getCurrentInventory: async () => [],
  getInventoryRiskCandidates: async () => [],
  listRecentMeals: async () => [],
  listPendingPlannedConsumptions: async () => [],
  listMealFeedbackRows: async () => []
});
