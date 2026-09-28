import type { FamilyStateWriter } from '../../src/ports/family-state-writer.js';

const defaultToolCallId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

export const createEmptyFamilyStateWriter = (): FamilyStateWriter => ({
  recordPurchaseAfterConfirmation: async () => ({
    toolCallId: defaultToolCallId,
    status: 'succeeded',
    purchaseRecordId: '55555555-5555-5555-5555-555555555551',
    inventoryChanges: []
  }),
  confirmMealExecution: async () => ({
    toolCallId: defaultToolCallId,
    status: 'succeeded',
    mealEventId: '88888888-8888-8888-8888-888888888881',
    inventoryChanges: []
  }),
  recordMealFeedback: async () => ({
    toolCallId: defaultToolCallId,
    status: 'succeeded',
    feedbackId: '99999999-9999-9999-9999-999999999991',
    requiresHumanReview: false
  }),
  adjustInventoryAfterFeedback: async () => ({
    toolCallId: defaultToolCallId,
    status: 'succeeded',
    inventoryItemId: '44444444-4444-4444-4444-444444444441',
    itemName: 'demo item',
    beforeQuantity: 0,
    afterQuantity: 0,
    unit: 'g'
  })
});
