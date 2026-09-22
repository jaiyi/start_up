import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/load-config.js';

const validDatabaseUrl = 'postgresql://family_nutrition_app:secret-password@127.0.0.1:5432/family_nutrition';

describe('Milestone 2 configuration validation', () => {
  it('requires MCP auth token', () => {
    const result = loadConfig({ NODE_ENV: 'test', FAMILY_NUTRITION_DATABASE_URL: validDatabaseUrl });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG_VALIDATION_ERROR');
      expect(result.error.message).toContain('MCP_AUTH_TOKEN');
    }
  });

  it('requires a Postgres database URL', () => {
    const result = loadConfig({ NODE_ENV: 'test', MCP_AUTH_TOKEN: 'test-token-value-with-safe-length' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG_VALIDATION_ERROR');
      expect(result.error.message).toContain('FAMILY_NUTRITION_DATABASE_URL');
    }
  });

  it('rejects placeholder database URLs', () => {
    const result = loadConfig({
      NODE_ENV: 'test',
      MCP_AUTH_TOKEN: 'test-token-value-with-safe-length',
      FAMILY_NUTRITION_DATABASE_URL: 'set-on-server-only'
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('FAMILY_NUTRITION_DATABASE_URL');
      expect(JSON.stringify(result)).not.toContain('set-on-server-only');
    }
  });

  it('rejects malformed or non-Postgres database URLs', () => {
    const malformed = loadConfig({
      NODE_ENV: 'test',
      MCP_AUTH_TOKEN: 'test-token-value-with-safe-length',
      FAMILY_NUTRITION_DATABASE_URL: 'not-a-url'
    });
    const nonPostgres = loadConfig({
      NODE_ENV: 'test',
      MCP_AUTH_TOKEN: 'test-token-value-with-safe-length',
      FAMILY_NUTRITION_DATABASE_URL: 'https://example.com/db'
    });

    expect(malformed.ok).toBe(false);
    expect(nonPostgres.ok).toBe(false);
  });

  it('rejects known placeholder MCP auth tokens', () => {
    const placeholderResults = [
      'change-me-token',
      'replace-with-local-dev-token',
      'set-with-generated-server-token',
      'example-server-token',
      'change-me',
      'replace-me'
    ].map((token) =>
      loadConfig({ NODE_ENV: 'test', MCP_AUTH_TOKEN: token, FAMILY_NUTRITION_DATABASE_URL: validDatabaseUrl })
    );

    for (const result of placeholderResults) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('MCP_AUTH_TOKEN');
        expect(JSON.stringify(result)).not.toContain('change-me-token');
        expect(JSON.stringify(result)).not.toContain('replace-with-local-dev-token');
      }
    }
  });

  it('rejects production MCP auth tokens that are too short', () => {
    const result = loadConfig({
      NODE_ENV: 'production',
      MCP_AUTH_TOKEN: 'short-token',
      FAMILY_NUTRITION_DATABASE_URL: validDatabaseUrl
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('MCP_AUTH_TOKEN');
      expect(JSON.stringify(result)).not.toContain('short-token');
    }
  });

  it('loads safe test configuration with deployment variable aliases', () => {
    const result = loadConfig({
      NODE_ENV: 'test',
      FAMILY_NUTRITION_MCP_AUTH_TOKEN: 'test-token-value-with-safe-length',
      FAMILY_NUTRITION_DATABASE_URL: validDatabaseUrl,
      PORT: '3099',
      DATABASE_POOL_MAX: '4',
      DATABASE_CONNECTION_TIMEOUT_MS: '2500',
      DATABASE_IDLE_TIMEOUT_MS: '12000',
      DATABASE_STATEMENT_TIMEOUT_MS: '3500'
    });

    expect(result).toEqual({
      ok: true,
      value: {
        mcpAuthToken: 'test-token-value-with-safe-length',
        nodeEnv: 'test',
        port: 3099,
        databaseUrl: validDatabaseUrl,
        databasePoolMax: 4,
        databaseConnectionTimeoutMs: 2500,
        databaseIdleTimeoutMs: 12000,
        databaseStatementTimeoutMs: 3500
      }
    });
  });

  it('loads safe test configuration with local variable aliases and defaults', () => {
    const result = loadConfig({ NODE_ENV: 'test', MCP_AUTH_TOKEN: 'test-token-value-with-safe-length', DATABASE_URL: validDatabaseUrl });

    expect(result).toEqual({
      ok: true,
      value: {
        mcpAuthToken: 'test-token-value-with-safe-length',
        nodeEnv: 'test',
        port: 3030,
        databaseUrl: validDatabaseUrl,
        databasePoolMax: 2,
        databaseConnectionTimeoutMs: 2000,
        databaseIdleTimeoutMs: 10000,
        databaseStatementTimeoutMs: 3000
      }
    });
  });

  it('rejects invalid explicit ports instead of silently falling back', () => {
    const result = loadConfig({
      NODE_ENV: 'test',
      MCP_AUTH_TOKEN: 'test-token-value-with-safe-length',
      FAMILY_NUTRITION_DATABASE_URL: validDatabaseUrl,
      PORT: '99999'
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('PORT');
    }
  });

  it('rejects invalid pool and timeout values', () => {
    const invalidPool = loadConfig({
      NODE_ENV: 'test',
      MCP_AUTH_TOKEN: 'test-token-value-with-safe-length',
      FAMILY_NUTRITION_DATABASE_URL: validDatabaseUrl,
      DATABASE_POOL_MAX: '0'
    });
    const invalidTimeout = loadConfig({
      NODE_ENV: 'test',
      MCP_AUTH_TOKEN: 'test-token-value-with-safe-length',
      FAMILY_NUTRITION_DATABASE_URL: validDatabaseUrl,
      DATABASE_CONNECTION_TIMEOUT_MS: 'abc'
    });

    expect(invalidPool.ok).toBe(false);
    expect(invalidTimeout.ok).toBe(false);
  });

  it('does not include secret values in validation errors', () => {
    const result = loadConfig({
      NODE_ENV: 'test',
      MCP_AUTH_TOKEN: '',
      FAMILY_NUTRITION_DATABASE_URL: validDatabaseUrl
    });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('secret-password');
    expect(JSON.stringify(result)).not.toContain('postgresql://');
  });
});
