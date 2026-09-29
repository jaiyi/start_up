import { createPostgresPool } from './adapters/postgres/create-postgres-pool.js';
import { createPostgresFamilyStateReader } from './adapters/postgres/postgres-family-state-reader.js';
import { createPostgresFamilyStateWriter } from './adapters/postgres/postgres-family-state-writer.js';
import { createPostgresHealthChecker } from './adapters/postgres/postgres-health-checker.js';
import { loadConfig } from './config/load-config.js';
import { checkServiceHealth } from './application/check-service-health.js';
import { createErrorResponse } from './mcp/response.js';
import { startHttpServer } from './mcp/server.js';

const configResult = loadConfig(process.env);

if (!configResult.ok) {
  console.error(JSON.stringify(createErrorResponse(configResult.error.code, configResult.error.message)));
  process.exit(1);
}

const config = configResult.value;
const pool = createPostgresPool(config);
const databaseHealthChecker = createPostgresHealthChecker(pool);
const familyStateReader = createPostgresFamilyStateReader(pool);
const familyStateWriter = createPostgresFamilyStateWriter(pool);
const startupHealth = await checkServiceHealth(databaseHealthChecker);

if (startupHealth.status !== 'ok') {
  console.error(
    JSON.stringify(
      createErrorResponse('DATABASE_UNAVAILABLE', 'Postgres database is unavailable or family_state schema is not ready')
    )
  );
  await databaseHealthChecker.close();
  process.exit(1);
}

const server = startHttpServer(config, {
  databaseHealthChecker,
  familyStateReader,
  familyStateWriter,
  allowedFamilyIds: config.allowedFamilyIds
});

const shutdown = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  await databaseHealthChecker.close();
};

process.once('SIGINT', () => {
  shutdown()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});

process.once('SIGTERM', () => {
  shutdown()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});

server.on('listening', () => {
  console.log(
    JSON.stringify({
      success: true,
      data: {
        status: 'listening',
        service: 'family-nutrition-state-mcp',
        milestone: '4',
        port: config.port,
        database: startupHealth.database
      },
      error: null,
      metadata: {}
    })
  );
});
