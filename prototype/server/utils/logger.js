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
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'pipeline-v2' },
  transports: [
    new transports.Console({ 
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    // Write logs to server/logs relative to project root
    new transports.File({ filename: path.join(__dirname, '..', 'logs', 'pipeline-v2.log') })
  ]
});

/**
 * LLM-specific logging functions
 */
export const llmLogger = {
  /**
   * Log token usage with structured metadata
   */
  logTokenUsage: (chainName, tokensAdded, totalTokens, traceId) => {
    logger.debug('LLM token usage', {
      chainName,
      tokensAdded,
      totalTokens,
      traceId,
      category: 'token_usage'
    });
  },

  /**
   * Log LLM operation start
   */
  logLLMStart: (chainName, promptCount, traceId) => {
    logger.debug('LLM operation started', {
      chainName,
      promptCount,
      traceId,
      category: 'llm_operation'
    });
  },

  /**
   * Log LLM operation completion
   */
  logLLMEnd: (chainName, traceId) => {
    logger.debug('LLM operation completed', {
      chainName,
      traceId,
      category: 'llm_operation'
    });
  },

  /**
   * Log LLM errors with structured context
   */
  logLLMError: (chainName, error, traceId) => {
    logger.error('LLM operation failed', {
      chainName,
      error: error.message,
      stack: error.stack,
      traceId,
      category: 'llm_error'
    });
  }
};

/**
 * Dedicated logger for pipeline status events
 */
export const statusLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'pipeline-status' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `[STATUS] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    }),
    // Write status logs to dedicated file
    new transports.File({ filename: path.join(__dirname, '..', 'logs', 'pipeline-status.log') })
  ]
});

export default logger; 