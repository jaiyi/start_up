export type AppConfig = {
  readonly mcpAuthToken: string;
  readonly nodeEnv: string;
  readonly port: number;
  readonly databaseUrl: string;
  readonly databasePoolMax: number;
  readonly databaseConnectionTimeoutMs: number;
  readonly databaseIdleTimeoutMs: number;
  readonly databaseStatementTimeoutMs: number;
};

type ConfigError = {
  readonly code: 'CONFIG_VALIDATION_ERROR';
  readonly message: string;
};

type ConfigResult =
  | { readonly ok: true; readonly value: AppConfig }
  | { readonly ok: false; readonly error: ConfigError };

type DatabaseUrlResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: ConfigError };

type NumberResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly error: ConfigError };

const DEFAULT_PORT = 3030;
const DEFAULT_DATABASE_POOL_MAX = 2;
const DEFAULT_DATABASE_CONNECTION_TIMEOUT_MS = 2000;
const DEFAULT_DATABASE_IDLE_TIMEOUT_MS = 10_000;
const DEFAULT_DATABASE_STATEMENT_TIMEOUT_MS = 3000;

const PLACEHOLDER_VALUES = new Set(['set-on-server-only', 'change-me', 'replace-me']);
const PLACEHOLDER_TOKEN_VALUES = new Set(['change-me', 'replace-me', 'local-dev-token']);
const PLACEHOLDER_TOKEN_PREFIXES = ['change-me', 'replace-with', 'set-with', 'example-'] as const;
const MIN_PRODUCTION_TOKEN_LENGTH = 24;

const createConfigError = (message: string): ConfigError => ({
  code: 'CONFIG_VALIDATION_ERROR',
  message
});

const getFirstNonEmpty = (env: NodeJS.ProcessEnv, names: readonly string[]): string | undefined => {
  const found = names.map((name) => env[name]?.trim()).find((value) => value && value.length > 0);

  return found || undefined;
};

const parseInteger = (
  value: string | undefined,
  name: string,
  defaultValue: number,
  limits: { readonly min: number; readonly max: number }
): NumberResult => {
  if (!value) {
    return { ok: true, value: defaultValue };
  }

  const parsed = Number.parseInt(value, 10);
  const isIntegerString = /^\d+$/.test(value);
  if (!isIntegerString || Number.isNaN(parsed) || parsed < limits.min || parsed > limits.max) {
    return {
      ok: false,
      error: createConfigError(`Invalid environment variable: ${name} must be an integer between ${limits.min} and ${limits.max}`)
    };
  }

  return { ok: true, value: parsed };
};

const parsePort = (value: string | undefined): NumberResult =>
  parseInteger(value, 'PORT', DEFAULT_PORT, { min: 1, max: 65_535 });

const parseDatabaseUrl = (value: string | undefined): DatabaseUrlResult => {
  if (!value) {
    return {
      ok: false,
      error: createConfigError('Missing required environment variable: FAMILY_NUTRITION_DATABASE_URL or DATABASE_URL')
    };
  }

  if (PLACEHOLDER_VALUES.has(value)) {
    return {
      ok: false,
      error: createConfigError('Invalid environment variable: FAMILY_NUTRITION_DATABASE_URL must be set to a real Postgres URL')
    };
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
      return {
        ok: false,
        error: createConfigError('Invalid environment variable: FAMILY_NUTRITION_DATABASE_URL must use postgres:// or postgresql://')
      };
    }
  } catch {
    return {
      ok: false,
      error: createConfigError('Invalid environment variable: FAMILY_NUTRITION_DATABASE_URL must be a valid URL')
    };
  }

  return { ok: true, value };
};

const parseAuthToken = (value: string | undefined, nodeEnv: string): DatabaseUrlResult => {
  if (!value) {
    return {
      ok: false,
      error: createConfigError('Missing required environment variable: MCP_AUTH_TOKEN or FAMILY_NUTRITION_MCP_AUTH_TOKEN')
    };
  }

  if (PLACEHOLDER_TOKEN_VALUES.has(value) || PLACEHOLDER_TOKEN_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return {
      ok: false,
      error: createConfigError('Invalid environment variable: MCP_AUTH_TOKEN must be replaced with a real secret token')
    };
  }

  if (nodeEnv === 'production' && value.length < MIN_PRODUCTION_TOKEN_LENGTH) {
    return {
      ok: false,
      error: createConfigError('Invalid environment variable: MCP_AUTH_TOKEN must be at least 24 characters in production')
    };
  }

  return { ok: true, value };
};

export const loadConfig = (env: NodeJS.ProcessEnv): ConfigResult => {
  const nodeEnv = env.NODE_ENV?.trim() || 'development';
  const authTokenResult = parseAuthToken(
    getFirstNonEmpty(env, ['FAMILY_NUTRITION_MCP_AUTH_TOKEN', 'MCP_AUTH_TOKEN']),
    nodeEnv
  );

  if (!authTokenResult.ok) {
    return authTokenResult;
  }

  const databaseUrlResult = parseDatabaseUrl(getFirstNonEmpty(env, ['FAMILY_NUTRITION_DATABASE_URL', 'DATABASE_URL']));
  if (!databaseUrlResult.ok) {
    return databaseUrlResult;
  }

  const portResult = parsePort(env.PORT);
  if (!portResult.ok) {
    return portResult;
  }

  const poolMaxResult = parseInteger(env.DATABASE_POOL_MAX, 'DATABASE_POOL_MAX', DEFAULT_DATABASE_POOL_MAX, {
    min: 1,
    max: 20
  });
  if (!poolMaxResult.ok) {
    return poolMaxResult;
  }

  const connectionTimeoutResult = parseInteger(
    env.DATABASE_CONNECTION_TIMEOUT_MS,
    'DATABASE_CONNECTION_TIMEOUT_MS',
    DEFAULT_DATABASE_CONNECTION_TIMEOUT_MS,
    { min: 100, max: 60_000 }
  );
  if (!connectionTimeoutResult.ok) {
    return connectionTimeoutResult;
  }

  const idleTimeoutResult = parseInteger(
    env.DATABASE_IDLE_TIMEOUT_MS,
    'DATABASE_IDLE_TIMEOUT_MS',
    DEFAULT_DATABASE_IDLE_TIMEOUT_MS,
    { min: 1000, max: 300_000 }
  );
  if (!idleTimeoutResult.ok) {
    return idleTimeoutResult;
  }

  const statementTimeoutResult = parseInteger(
    env.DATABASE_STATEMENT_TIMEOUT_MS,
    'DATABASE_STATEMENT_TIMEOUT_MS',
    DEFAULT_DATABASE_STATEMENT_TIMEOUT_MS,
    { min: 100, max: 60_000 }
  );
  if (!statementTimeoutResult.ok) {
    return statementTimeoutResult;
  }

  return {
    ok: true,
    value: {
      mcpAuthToken: authTokenResult.value,
      nodeEnv,
      port: portResult.value,
      databaseUrl: databaseUrlResult.value,
      databasePoolMax: poolMaxResult.value,
      databaseConnectionTimeoutMs: connectionTimeoutResult.value,
      databaseIdleTimeoutMs: idleTimeoutResult.value,
      databaseStatementTimeoutMs: statementTimeoutResult.value
    }
  };
};
