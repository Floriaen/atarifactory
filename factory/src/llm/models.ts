import type { Effort } from './provider.js';

export type TaskPreset = 'creative' | 'structured' | 'validation';

export interface ModelConfig {
  model: string;
  maxTokens: number;
  effort?: Effort;
}

export const OPUS_MODEL = 'claude-opus-4-8';
export const SONNET_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_MODEL = OPUS_MODEL;

/**
 * Task-type → model/budget. Per-task tiering: Opus for idea generation (where
 * novelty is won); Sonnet for the well-specified expansion and ranking. The
 * critic overrides to Opus at the call site (judgment quality). Depth is set via
 * `effort`, never temperature/budget_tokens (those 400 on Opus 4.8 / Sonnet 4.6).
 */
export const PRESETS: Record<TaskPreset, ModelConfig> = {
  creative: { model: OPUS_MODEL, maxTokens: 2048, effort: 'high' },
  structured: { model: SONNET_MODEL, maxTokens: 2048, effort: 'medium' },
  validation: { model: SONNET_MODEL, maxTokens: 1024, effort: 'low' },
};

export function resolveModelConfig(preset: TaskPreset, overrides?: Partial<ModelConfig>): ModelConfig {
  return { ...PRESETS[preset], ...overrides };
}
