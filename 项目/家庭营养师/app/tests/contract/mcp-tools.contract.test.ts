import { describe, expect, it } from 'vitest';
import { listRegisteredTools } from '../../src/mcp/tool-registry.js';

const allowedMilestoneFourTools = [
  'adjust_inventory_after_feedback',
  'confirm_meal_execution',
  'get_current_inventory',
  'get_inventory_risks',
  'get_meal_feedback_summary',
  'health_check',
  'list_pending_planned_consumptions',
  'list_recent_meals',
  'record_meal_feedback',
  'record_purchase_after_confirmation'
] as const;
const forbiddenToolNames = ['sql', 'raw_sql', 'query_database', 'execute_sql', 'shell_exec'];

describe('Milestone 4 MCP tool registry', () => {
  it('exposes the Milestone 4 read and confirmed-write tool allowlist', () => {
    const tools = listRegisteredTools();
    const toolNames = tools.map((tool) => tool.name).sort();

    expect(toolNames).toEqual([...allowedMilestoneFourTools].sort());
  });

  it('marks read and write tools with explicit readOnly metadata', () => {
    const tools = listRegisteredTools();
    const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

    expect(toolsByName.get('health_check')?.readOnly).toBe(true);
    expect(toolsByName.get('get_current_inventory')?.readOnly).toBe(true);
    expect(toolsByName.get('record_purchase_after_confirmation')?.readOnly).toBe(false);
    expect(toolsByName.get('confirm_meal_execution')?.readOnly).toBe(false);
    expect(toolsByName.get('record_meal_feedback')?.readOnly).toBe(false);
    expect(toolsByName.get('adjust_inventory_after_feedback')?.readOnly).toBe(false);
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
