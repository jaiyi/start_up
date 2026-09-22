import { describe, expect, it, vi } from 'vitest';
import { createMcpServer } from '../../src/mcp/server.js';
import type { DatabaseHealthChecker } from '../../src/ports/database-health.js';

const createHealthyChecker = (): DatabaseHealthChecker => ({
  check: vi.fn(async () => ({ status: 'ok' as const, schema: 'ready' as const, latencyMs: 5 })),
  close: vi.fn(async () => undefined)
});

describe('Milestone 2 MCP server factory', () => {
  it('creates a connected-ready MCP server instance with injected database health checker', () => {
    const server = createMcpServer({ databaseHealthChecker: createHealthyChecker() });

    expect(server.isConnected()).toBe(false);
  });
});
