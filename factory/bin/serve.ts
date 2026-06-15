// The pipeline service host: `npm run serve` (or `make serve`). The factory's public
// HTTP face — stateless, billable, the surface the admin and any other client consume.
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

import { createApp } from '../server/index.js';
import { createLogger } from '../src/api.js';

const PORT = Number(process.env.PORT ?? 8910);
const logger = createLogger({ level: process.env.LOG_LEVEL ?? 'info' });

const app = createApp({
  logger,
  ...(process.env.PIPELINE_TOKEN ? { token: process.env.PIPELINE_TOKEN } : {}),
});

app.listen(PORT, '127.0.0.1', () => {
  logger.info({ port: PORT }, 'pipeline service listening');
  console.log(`[pipeline] http://127.0.0.1:${PORT}`);
});
