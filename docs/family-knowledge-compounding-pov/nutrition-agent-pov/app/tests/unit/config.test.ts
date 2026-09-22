import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/load-config.js';

describe('Milestone 0 configuration validation', () => {
  it('requires MCP_AUTH_TOKEN', () => {
    const result = loadConfig({ NODE_ENV: 'test' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG_VALIDATION_ERROR');
      expect(result.error.message).toContain('MCP_AUTH_TOKEN');
    }
  });

  it('loads safe test configuration', () => {
    const result = loadConfig({ NODE_ENV: 'test', MCP_AUTH_TOKEN: 'test-token-value', PORT: '3099' });

    expect(result).toEqual({
      ok: true,
      value: {
        mcpAuthToken: 'test-token-value',
        nodeEnv: 'test',
        port: 3099
      }
    });
  });

  it('defaults the port only when PORT is unset', () => {
    const result = loadConfig({ NODE_ENV: 'test', MCP_AUTH_TOKEN: 'test-token-value' });

    expect(result).toEqual({
      ok: true,
      value: {
        mcpAuthToken: 'test-token-value',
        nodeEnv: 'test',
        port: 3030
      }
    });
  });

  it('rejects invalid explicit ports instead of silently falling back', () => {
    const result = loadConfig({ NODE_ENV: 'test', MCP_AUTH_TOKEN: 'test-token-value', PORT: '99999' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('PORT');
    }
  });

  it('rejects non-numeric explicit ports', () => {
    const result = loadConfig({ NODE_ENV: 'test', MCP_AUTH_TOKEN: 'test-token-value', PORT: 'abc' });

    expect(result.ok).toBe(false);
  });

  it('does not include secret values in validation errors', () => {
    const result = loadConfig({ NODE_ENV: 'test', MCP_AUTH_TOKEN: '', DATABASE_URL: 'postgresql://user:secret@localhost/db' });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('postgresql://');
  });
});
