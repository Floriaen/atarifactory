import type { Usage } from './provider.js';

/** USD per 1M tokens. */
export interface ModelPrice {
  in: number;
  out: number;
}

export const PRICING: Record<string, ModelPrice> = {
  'claude-opus-4-8': { in: 5, out: 25 },
  'claude-sonnet-4-6': { in: 3, out: 15 },
  'claude-haiku-4-5': { in: 1, out: 5 },
  default: { in: 5, out: 25 },
};

export function priceFor(model: string): ModelPrice {
  return PRICING[model] ?? PRICING.default!;
}

/** USD cost of one call. Cache tokens are billed as input here (approximation). */
export function costFor(usage: Usage, model: string): number {
  const price = priceFor(model);
  const inputTokens =
    usage.inputTokens + (usage.cacheReadInputTokens ?? 0) + (usage.cacheCreationInputTokens ?? 0);
  return (inputTokens / 1_000_000) * price.in + (usage.outputTokens / 1_000_000) * price.out;
}
