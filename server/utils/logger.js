/**
 * logger utility
 * Provides log, info, and error logging functions.
 */
import { createLogger, format, transports } from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'pipeline-v2' },
  transports: [
    new transports.Console({ format: format.simple() }),
    // Write logs to server/logs relative to project root
    new transports.File({ filename: path.join(__dirname, '..', 'logs', 'pipeline-v2.log') })
  ]
});

export default logger; 