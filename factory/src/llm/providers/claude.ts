import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ZodType } from 'zod/v4';
import type { LLMMessage, LLMProvider, StructuredOptions, StructuredResult, Usage } from '../provider.js';
import { MissingUsageError, ProviderError, SchemaValidationError } from '../errors.js';

/**
 * Anthropic implementation. Uses structured outputs (`output_config.format` via
 * messages.parse) on Opus 4.8 — never temperature/top_p/budget_tokens (those 400
 * on 4.8). Depth is set with `effort`. Output is re-validated through the SAME
 * Zod schema, and usage is read from the response (fail loud if absent).
 */
export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';
  private readonly client: Anthropic;

  constructor(client?: Anthropic) {
    this.client = client ?? new Anthropic();
  }

  async structured<T>(
    schema: ZodType<T>,
    system: string,
    messages: LLMMessage[],
    opts: StructuredOptions,
  ): Promise<StructuredResult<T>> {
    let res;
    try {
      res = await this.client.messages.parse(
        {
          model: opts.model,
          max_tokens: opts.maxTokens,
          ...(system ? { system } : {}),
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          output_config: {
            format: zodOutputFormat(schema),
            ...(opts.effort ? { effort: opts.effort } : {}),
          },
        },
        opts.signal ? { signal: opts.signal } : undefined,
      );
    } catch (err) {
      throw new ProviderError(
        `Claude request failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    const usage = extractUsage(res.usage);

    if (res.parsed_output == null) {
      throw new SchemaValidationError(
        `Claude returned no schema-valid output (stop_reason=${res.stop_reason ?? 'unknown'})`,
      );
    }

    // Re-validate through the same Zod path as the mock provider — single source of truth.
    const data = schema.parse(res.parsed_output);
    return { data, usage, model: res.model, stopReason: res.stop_reason ?? undefined, raw: res };
  }
}

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** Read tokens from response.usage. Never estimate — throw if missing. */
function extractUsage(u: AnthropicUsage | undefined): Usage {
  if (!u || typeof u.input_tokens !== 'number' || typeof u.output_tokens !== 'number') {
    throw new MissingUsageError('Claude response is missing token usage');
  }
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadInputTokens: u.cache_read_input_tokens ?? undefined,
    cacheCreationInputTokens: u.cache_creation_input_tokens ?? undefined,
  };
}
