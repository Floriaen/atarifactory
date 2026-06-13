import { MODEL_PRICING_USD } from '../config/pricing.config.js';

export function computeCostTotals(sharedState) {
  const modelTotals = sharedState.modelTotals || {};
  const byModel = {};
  let totalPrompt = 0;
  let totalCompletion = 0;
  let totalUsd = 0;

  const entries = Object.entries(modelTotals);
  if (entries.length === 0) {
    // Fallback: use aggregate counters if model buckets unavailable
    const model = process.env.OPENAI_MODEL || 'default';
    const prompt = Number(sharedState.promptTokens || 0);
    const completion = Number(sharedState.completionTokens || 0);
    const pricing = MODEL_PRICING_USD[model] || MODEL_PRICING_USD.default;
    const usd = (prompt / 1000) * pricing.in + (completion / 1000) * pricing.out;
    byModel[model] = { prompt, completion, total: prompt + completion, usd };
    totalPrompt += prompt;
    totalCompletion += completion;
    totalUsd += usd;
  } else {
    for (const [model, buckets] of entries) {
      const prompt = Number(buckets.prompt || 0);
      const completion = Number(buckets.completion || 0);
      const pricing = MODEL_PRICING_USD[model] || MODEL_PRICING_USD.default;
      const usd = (prompt / 1000) * pricing.in + (completion / 1000) * pricing.out;
      byModel[model] = { prompt, completion, total: prompt + completion, usd };
      totalPrompt += prompt;
      totalCompletion += completion;
      totalUsd += usd;
    }
  }

  return {
    byModel,
    total: {
      prompt: totalPrompt,
      completion: totalCompletion,
      total: totalPrompt + totalCompletion,
      usd: totalUsd
    }
  };
}

