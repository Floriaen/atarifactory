import type { ZodType } from 'zod/v4';
import type { LLMMessage, LLMProvider, Usage } from './provider.js';
import { resolveModelConfig, type ModelConfig, type TaskPreset } from './models.js';
import { costFor } from './pricing.js';
import { loadPrompt, renderPrompt } from './prompts.js';
import type { Observer } from '../observability/observer.js';

export interface ChainDef<I, O> {
  name: string;
  /** Markdown user-prompt template with {{var}} placeholders. */
  promptFile: string;
  /** Optional system prompt: inline `system` wins over `systemFile`. */
  systemFile?: string;
  system?: string;
  inputSchema: ZodType<I>;
  outputSchema: ZodType<O>;
  preset: TaskPreset;
}

export interface ChainDeps {
  provider: LLMProvider;
  observer: Observer;
  modelOverride?: Partial<ModelConfig>;
  /** Host-driven cancellation: aborting it cancels the in-flight LLM call (e.g. on a dropped HTTP connection). */
  signal?: AbortSignal;
}

export interface Chain<I, O> {
  readonly name: string;
  run(input: I): Promise<{ data: O; usage: Usage }>;
}

/**
 * The in-house replacement for LangChain. Explicit, awaited control flow:
 * parse input → render prompt → provider.structured() → observe → return.
 * Timing/status live in withNode; fan-out lives in Observer — keep this small.
 */
export function defineChain<I, O>(def: ChainDef<I, O>): (deps: ChainDeps) => Chain<I, O> {
  return (deps) => ({
    name: def.name,
    async run(input) {
      const parsed = def.inputSchema.parse(input) as Record<string, unknown>;
      const template = await loadPrompt(def.promptFile);
      const user = renderPrompt(template, parsed);
      const system = def.system ?? (def.systemFile ? await loadPrompt(def.systemFile) : '');
      const cfg = resolveModelConfig(def.preset, deps.modelOverride);
      const messages: LLMMessage[] = [{ role: 'user', content: user }];

      const started = Date.now();
      const res = await deps.provider.structured(def.outputSchema, system, messages, {
        model: cfg.model,
        maxTokens: cfg.maxTokens,
        effort: cfg.effort,
        toolName: def.name,
        ...(deps.signal ? { signal: deps.signal } : {}),
      });
      const latencyMs = Date.now() - started;

      deps.observer.llmCall({
        node: def.name,
        model: res.model,
        usage: res.usage,
        costUsd: costFor(res.usage, res.model),
        latencyMs,
        system,
        messages,
        output: res.data,
      });

      return { data: res.data, usage: res.usage };
    },
  });
}
