import type { ZodType } from 'zod/v4';
import type { LLMMessage, LLMProvider, StructuredOptions, StructuredResult, Usage } from '../provider.js';

export interface MockRequest {
  schema: ZodType<unknown>;
  system: string;
  messages: LLMMessage[];
  opts: StructuredOptions;
  callIndex: number;
}

export type Responder = (req: MockRequest) => unknown;

const DEFAULT_USAGE: Usage = { inputTokens: 10, outputTokens: 20 };

/**
 * Test double. Fixtures are validated through the SAME Zod path as production,
 * so a fixture that drifts from the schema fails the test (no mock/real divergence).
 */
export class MockProvider implements LLMProvider {
  readonly name = 'mock';
  private callIndex = 0;

  constructor(
    private readonly responder: Responder,
    private readonly usage: Usage = DEFAULT_USAGE,
  ) {}

  async structured<T>(
    schema: ZodType<T>,
    system: string,
    messages: LLMMessage[],
    opts: StructuredOptions,
  ): Promise<StructuredResult<T>> {
    const raw = this.responder({ schema, system, messages, opts, callIndex: this.callIndex++ });
    const data = schema.parse(raw);
    return { data, usage: this.usage, model: opts.model, stopReason: 'mock' };
  }
}

/** Build a MockProvider that dispatches on the chain/tool name. */
export function fromMap(map: Record<string, unknown | Responder>, usage?: Usage): MockProvider {
  return new MockProvider((req) => {
    const key = req.opts.toolName ?? '';
    if (!(key in map)) throw new Error(`MockProvider: no fixture for "${key}"`);
    const entry = map[key];
    return typeof entry === 'function' ? (entry as Responder)(req) : entry;
  }, usage);
}
