import type { Observer } from './observer.js';

/** Wraps a node with start/end/error + timing. Always re-throws — fail loud. */
export async function withNode<T>(observer: Observer, node: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  observer.nodeStart(node);
  try {
    const result = await fn();
    observer.nodeEnd(node, Date.now() - start);
    return result;
  } catch (err) {
    observer.nodeError(node, err, Date.now() - start);
    throw err;
  }
}
