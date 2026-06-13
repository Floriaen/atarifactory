import type { Usage } from '../llm/provider.js';
import { costFor } from '../llm/pricing.js';

export interface ModelUsage {
  model: string;
  usage: Required<Usage>;
  costUsd: number;
  calls: number;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  calls: number;
}

/** Synchronous, exact accumulation from per-call `response.usage`. */
export class UsageAggregator {
  private byModel = new Map<string, ModelUsage>();

  add(model: string, usage: Usage): void {
    const cur =
      this.byModel.get(model) ??
      {
        model,
        usage: { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
        costUsd: 0,
        calls: 0,
      };
    cur.usage.inputTokens += usage.inputTokens;
    cur.usage.outputTokens += usage.outputTokens;
    cur.usage.cacheReadInputTokens += usage.cacheReadInputTokens ?? 0;
    cur.usage.cacheCreationInputTokens += usage.cacheCreationInputTokens ?? 0;
    cur.costUsd += costFor(usage, model);
    cur.calls += 1;
    this.byModel.set(model, cur);
  }

  perModel(): ModelUsage[] {
    return [...this.byModel.values()];
  }

  totals(): UsageTotals {
    const t: UsageTotals = { inputTokens: 0, outputTokens: 0, costUsd: 0, calls: 0 };
    for (const m of this.byModel.values()) {
      t.inputTokens += m.usage.inputTokens;
      t.outputTokens += m.usage.outputTokens;
      t.costUsd += m.costUsd;
      t.calls += m.calls;
    }
    return t;
  }
}
