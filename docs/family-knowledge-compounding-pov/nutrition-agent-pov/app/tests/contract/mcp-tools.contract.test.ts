import { describe, expect, it } from 'vitest';
import { listRegisteredTools } from '../../src/mcp/tool-registry.js';

const allowedMilestoneZeroTools = ['health_check'] as const;
const forbiddenToolNames = ['sql', 'raw_sql', 'query_database', 'execute_sql', 'shell_exec'];

describe('Milestone 0 MCP tool registry', () => {
  it('exposes only the Milestone 0 tool allowlist', () => {
    const tools = listRegisteredTools();
    const toolNames = tools.map((tool) => tool.name).sort();

    expect(toolNames).toEqual([...allowedMilestoneZeroTools].sort());
  });

  it('does not expose arbitrary SQL or shell execution tools', () => {
    const tools = listRegisteredTools();
    const toolNames = tools.map((tool) => tool.name);

    for (const forbiddenToolName of forbiddenToolNames) {
      expect(toolNames).not.toContain(forbiddenToolName);
    }
  });

  it('provides descriptions without leaking implementation secrets', () => {
    const tools = listRegisteredTools();
    const serializedTools = JSON.stringify(tools);

    expect(serializedTools).not.toMatch(/password/i);
    expect(serializedTools).not.toMatch(/token/i);
    expect(serializedTools).not.toMatch(/database_url/i);
    expect(serializedTools).not.toMatch(/postgresql:\/\//i);
  });
});
