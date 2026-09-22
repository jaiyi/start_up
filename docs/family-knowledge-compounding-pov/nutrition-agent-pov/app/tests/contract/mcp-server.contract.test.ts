import { describe, expect, it } from 'vitest';
import { createMcpServer } from '../../src/mcp/server.js';

describe('Milestone 0 MCP server factory', () => {
  it('creates a connected-ready MCP server instance', () => {
    const server = createMcpServer();

    expect(server.isConnected()).toBe(false);
  });
});
