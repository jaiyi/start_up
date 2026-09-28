import { describe, expect, it } from 'vitest';
import { listRegisteredTools } from '../../src/mcp/tool-registry.js';

const allowedMilestoneThreeTools = [
  'get_current_inventory',
  'get_inventory_risks',
  'get_meal_feedback_summary',
  'health_check',
  'list_pending_planned_consumptions',
  'list_recent_meals'
] as const;
const forbiddenToolNames = ['sql', 'raw_sql', 'query_database', 'execute_sql', 'shell_exec'];

describe('Milestone 3 MCP tool registry', () => {
  it('exposes only the Milestone 3 read-only tool allowlist', () => {
    const tools = listRegisteredTools();
    const toolNames = tools.map((tool) => tool.name).sort();

    expect(toolNames).toEqual([...allowedMilestoneThreeTools].sort());
  });

  it('marks every registered tool as read-only', () => {
    const tools = listRegisteredTools();

    expect(tools.every((tool) => tool.readOnly)).toBe(true);
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
