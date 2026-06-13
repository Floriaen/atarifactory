import { Observer } from '../../src/observability/observer.js';
import { UsageAggregator } from '../../src/observability/usage.js';
import { createLogger } from '../../src/observability/logger.js';
import { createRunContext } from '../../src/observability/runContext.js';

/** Disk-free, silent observer for tests. */
export function testObserver() {
  const usage = new UsageAggregator();
  const logger = createLogger({ level: 'silent' });
  const observer = new Observer({ ctx: createRunContext({ model: 'mock' }), logger, usage });
  return { observer, usage };
}
