export type AppConfig = {
  readonly mcpAuthToken: string;
  readonly nodeEnv: string;
  readonly port: number;
};

type ConfigError = {
  readonly code: 'CONFIG_VALIDATION_ERROR';
  readonly message: string;
};

type ConfigResult =
  | { readonly ok: true; readonly value: AppConfig }
  | { readonly ok: false; readonly error: ConfigError };

type PortResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly error: ConfigError };

const DEFAULT_PORT = 3030;

const parsePort = (value: string | undefined): PortResult => {
  if (!value) {
    return { ok: true, value: DEFAULT_PORT };
  }

  const parsed = Number.parseInt(value, 10);
  const isIntegerString = /^\d+$/.test(value);
  if (!isIntegerString || Number.isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    return {
      ok: false,
      error: {
        code: 'CONFIG_VALIDATION_ERROR',
        message: 'Invalid environment variable: PORT must be an integer between 1 and 65535'
      }
    };
  }

  return { ok: true, value: parsed };
};

export const loadConfig = (env: NodeJS.ProcessEnv): ConfigResult => {
  const mcpAuthToken = env.MCP_AUTH_TOKEN?.trim();

  if (!mcpAuthToken) {
    return {
      ok: false,
      error: {
        code: 'CONFIG_VALIDATION_ERROR',
        message: 'Missing required environment variable: MCP_AUTH_TOKEN'
      }
    };
  }

  const portResult = parsePort(env.PORT);
  if (!portResult.ok) {
    return portResult;
  }

  return {
    ok: true,
    value: {
      mcpAuthToken,
      nodeEnv: env.NODE_ENV?.trim() || 'development',
      port: portResult.value
    }
  };
};
