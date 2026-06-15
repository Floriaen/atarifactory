import type { ZodType } from 'zod/v4';
import type { Usage } from '@game-factory/contracts';

export type Role = 'user' | 'assistant';

export interface LLMMessage {
  role: Role;
  content: string;
}

/** Token usage, read from the provider response — never estimated. Defined once as the wire shape in the contracts package. */
export type { Usage };

export interface StructuredResult<T> {
  data: T;
  usage: Usage;
  model: string;
  stopReason?: string;
  raw?: unknown;
}

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface StructuredOptions {
  model: string;
  maxTokens: number;
  effort?: Effort;
  /** Names the tool/output for tracing and provider tool-use. */
  toolName?: string;
  signal?: AbortSignal;
}

/**
 * The single call shape the design phase needs (ISP): a schema-constrained,
 * validated structured completion. Providers are interchangeable (LSP).
 */
export interface LLMProvider {
  readonly name: string;
  structured<T>(
    schema: ZodType<T>,
    system: string,
    messages: LLMMessage[],
    opts: StructuredOptions,
  ): Promise<StructuredResult<T>>;
}
