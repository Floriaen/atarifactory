import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import type { RunContext } from './runContext.js';

export interface RunStoreEvent {
  t: number;
  type: string;
  [k: string]: unknown;
}

/** Streams events to runs/<traceId>/events.jsonl and writes trace.json at finalize. */
export class RunStore {
  private readonly dir: string;
  private readonly ready: Promise<void>;

  constructor(ctx: RunContext, root = 'runs') {
    this.dir = `${root}/${ctx.traceId}`;
    this.ready = mkdir(this.dir, { recursive: true }).then(() => undefined);
  }

  async event(e: RunStoreEvent): Promise<void> {
    await this.ready;
    await appendFile(`${this.dir}/events.jsonl`, JSON.stringify(e) + '\n');
  }

  async finalize(trace: unknown): Promise<void> {
    await this.ready;
    await writeFile(`${this.dir}/trace.json`, JSON.stringify(trace, null, 2));
  }
}
