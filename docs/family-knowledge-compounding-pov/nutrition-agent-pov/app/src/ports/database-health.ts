export type DatabaseHealthStatus = 'ok' | 'unavailable';
export type DatabaseSchemaStatus = 'ready' | 'missing' | 'unknown';

export type DatabaseHealth = {
  readonly status: DatabaseHealthStatus;
  readonly schema: DatabaseSchemaStatus;
  readonly latencyMs: number;
};

export type DatabaseHealthChecker = {
  readonly check: () => Promise<DatabaseHealth>;
  readonly close: () => Promise<void>;
};
