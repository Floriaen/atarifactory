/**
 * logger utility
 * Provides log, info, and error logging functions.
 */
const { createLogger, format, transports } = require('winston');
const path = require('path');

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

module.exports = logger; 