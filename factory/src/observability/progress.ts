export interface ProgressEvent {
  phase: string;
  completed: number;
  total: number;
  fraction: number;
  label?: string;
}

export type ProgressListener = (e: ProgressEvent) => void;

/** Declarative weighted steps; emits a snapshot as each completes. */
export class ProgressTracker {
  private steps = new Map<string, number>();
  private done = new Set<string>();

  constructor(
    private readonly listener?: ProgressListener,
    private readonly phase = 'design',
  ) {}

  register(name: string, weight = 1): void {
    this.steps.set(name, weight);
  }

  complete(name: string, label?: string): void {
    if (!this.steps.has(name)) this.steps.set(name, 1);
    this.done.add(name);
    this.listener?.(this.snapshot(label));
  }

  private snapshot(label?: string): ProgressEvent {
    const total = [...this.steps.values()].reduce((a, b) => a + b, 0) || 1;
    let completed = 0;
    for (const [name, weight] of this.steps) if (this.done.has(name)) completed += weight;
    return { phase: this.phase, completed, total, fraction: completed / total, label };
  }
}
