import { describe, expect, it } from 'vitest';
import { assertFamilyAllowed, isFamilyAllowed } from '../../src/mcp/family-scope.js';

const familyId = '11111111-1111-1111-1111-111111111111';
const otherFamilyId = '11111111-1111-1111-1111-111111111112';

describe('Milestone 3 family scope checks', () => {
  it('allows configured family IDs case-insensitively', () => {
    expect(isFamilyAllowed({ allowedFamilyIds: [familyId.toUpperCase()] }, familyId)).toBe(true);
  });

  it('rejects family IDs outside the configured scope', () => {
    expect(isFamilyAllowed({ allowedFamilyIds: [familyId] }, otherFamilyId)).toBe(false);
    expect(() => assertFamilyAllowed({ allowedFamilyIds: [familyId] }, otherFamilyId)).toThrow('family_id is not allowed');
  });
});
