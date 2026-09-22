export type RegisteredTool = {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly readOnly: boolean;
};

const REGISTERED_TOOLS = [
  {
    name: 'health_check',
    title: 'Health check',
    description: 'Checks whether the Family Nutrition MCP service is running.',
    readOnly: true
  }
] as const satisfies readonly RegisteredTool[];

export const listRegisteredTools = (): readonly RegisteredTool[] => REGISTERED_TOOLS.map((tool) => ({ ...tool }));
