import { describe, expect, it, vi } from 'vitest';
import { createMcpServer } from '../../src/mcp/server.js';
import type { DatabaseHealthChecker } from '../../src/ports/database-health.js';
import { createEmptyFamilyStateReader } from '../support/family-state-reader.js';
import { createEmptyFamilyStateWriter } from '../support/family-state-writer.js';

const createHealthyChecker = (): DatabaseHealthChecker => ({
  check: vi.fn(async () => ({ status: 'ok' as const, schema: 'ready' as const, latencyMs: 5 })),
  close: vi.fn(async () => undefined)
});

describe('Milestone 4 MCP server factory', () => {
  it('creates a connected-ready MCP server instance with injected database health checker and state reader', () => {
    const server = createMcpServer({
      databaseHealthChecker: createHealthyChecker(),
      familyStateReader: createEmptyFamilyStateReader(),
      familyStateWriter: createEmptyFamilyStateWriter(),
      allowedFamilyIds: ['11111111-1111-1111-1111-111111111111']
    });

    expect(server.isConnected()).toBe(false);
  });
});
