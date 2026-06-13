import pino from 'pino';

export type Logger = pino.Logger;

export function createLogger(opts?: { level?: string; pretty?: boolean }): Logger {
  const level = opts?.level ?? process.env.LOG_LEVEL ?? 'info';
  if (level === 'silent') return pino({ level });
  const pretty = opts?.pretty ?? Boolean(process.stdout.isTTY);
  if (pretty) {
    return pino({ level, transport: { target: 'pino-pretty', options: { colorize: true } } });
  }
  return pino({ level });
}

export function withTrace(logger: Logger, traceId: string): Logger {
  return logger.child({ traceId });
}
