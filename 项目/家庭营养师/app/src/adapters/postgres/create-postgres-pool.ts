import pg from 'pg';
import type { AppConfig } from '../../config/load-config.js';

const { Pool } = pg;

export type PgPool = InstanceType<typeof Pool>;

export const createPostgresPool = (config: AppConfig): PgPool =>
  new Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolMax,
    connectionTimeoutMillis: config.databaseConnectionTimeoutMs,
    idleTimeoutMillis: config.databaseIdleTimeoutMs,
    statement_timeout: config.databaseStatementTimeoutMs
  });
