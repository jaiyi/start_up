import { loadConfig } from './config/load-config.js';
import { createErrorResponse } from './mcp/response.js';
import { startHttpServer } from './mcp/server.js';

const configResult = loadConfig(process.env);

if (!configResult.ok) {
  console.error(JSON.stringify(createErrorResponse(configResult.error.code, configResult.error.message)));
  process.exit(1);
}

const server = startHttpServer(configResult.value);

server.on('listening', () => {
  console.log(
    JSON.stringify({
      success: true,
      data: {
        status: 'listening',
        service: 'family-nutrition-state-mcp',
        port: configResult.value.port
      },
      error: null,
      metadata: {}
    })
  );
});
