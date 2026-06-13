import type { LLMMessage, Usage } from '../llm/provider.js';

export interface LlmCallRecord {
  node: string;
  model: string;
  usage: Usage;
  costUsd: number;
  latencyMs: number;
  /** Captured only when RunContext.devTrace is on. */
  system?: string;
  messages?: LLMMessage[];
  output?: unknown;
}

export interface NodeTiming {
  node: string;
  ms: number;
  status: 'ok' | 'error';
}
