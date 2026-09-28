import type { AppConfig } from '../config/load-config.js';

export type FamilyScope = Pick<AppConfig, 'allowedFamilyIds'>;

const normalizeFamilyId = (familyId: string): string => familyId.toLowerCase();

export const isFamilyAllowed = (scope: FamilyScope, familyId: string): boolean => {
  const normalizedFamilyId = normalizeFamilyId(familyId);

  return scope.allowedFamilyIds.map(normalizeFamilyId).includes(normalizedFamilyId);
};

export const assertFamilyAllowed = (scope: FamilyScope, familyId: string): void => {
  if (!isFamilyAllowed(scope, familyId)) {
    throw new Error('family_id is not allowed for this MCP service');
  }
};
