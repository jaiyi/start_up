export type RegisteredTool = {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly readOnly: boolean;
};

const REGISTERED_TOOLS = [
  {
    name: 'get_current_inventory',
    title: 'Get current inventory',
    description: 'Returns active inventory items for a family from the Family Nutrition state database.',
    readOnly: true
  },
  {
    name: 'get_inventory_risks',
    title: 'Get inventory risks',
    description: 'Returns expired, expiring, aging, and overstock risk signals for current inventory.',
    readOnly: true
  },
  {
    name: 'get_meal_feedback_summary',
    title: 'Get meal feedback summary',
    description: 'Returns summarized meal feedback signals and recent review items for a family.',
    readOnly: true
  },
  {
    name: 'health_check',
    title: 'Health check',
    description: 'Checks whether the Family Nutrition MCP service and Postgres state database are running.',
    readOnly: true
  },
  {
    name: 'list_pending_planned_consumptions',
    title: 'List pending planned consumptions',
    description: 'Returns planned ingredient consumptions with execution state for meal plans.',
    readOnly: true
  },
  {
    name: 'list_recent_meals',
    title: 'List recent meals',
    description: 'Returns recent cooked meal records and their dish items for a family.',
    readOnly: true
  }
] as const satisfies readonly RegisteredTool[];

export const listRegisteredTools = (): readonly RegisteredTool[] => REGISTERED_TOOLS.map((tool) => ({ ...tool }));
