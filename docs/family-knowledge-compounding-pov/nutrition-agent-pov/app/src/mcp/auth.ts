import type { AppConfig } from '../config/load-config.js';

type AuthHeaders = Readonly<Record<string, string | string[] | undefined>>;

export type AuthResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly errorCode: 'AUTH_REQUIRED' };

const getHeaderValue = (headers: AuthHeaders, headerName: string): string | undefined => {
  const normalizedHeaderName = headerName.toLowerCase();
  const matchingEntry = Object.entries(headers).find(([key]) => key.toLowerCase() === normalizedHeaderName);
  const value = matchingEntry?.[1];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const extractBearerToken = (authorization: string | undefined): string | null => {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

export const authenticateRequest = (headers: AuthHeaders, config: Pick<AppConfig, 'mcpAuthToken'>): AuthResult => {
  const providedToken = extractBearerToken(getHeaderValue(headers, 'authorization'));

  if (!providedToken || providedToken !== config.mcpAuthToken) {
    return { ok: false, errorCode: 'AUTH_REQUIRED' };
  }

  return { ok: true };
};
