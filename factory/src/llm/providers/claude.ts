import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ZodType } from 'zod/v4';
import type { LLMMessage, LLMProvider, StructuredOptions, StructuredResult, Usage } from '../provider.js';
import { MissingUsageError, ProviderError, SchemaValidationError } from '../errors.js';

/**
 * Anthropic implementation. Uses structured outputs (`output_config.format`) on Opus 4.8 — never
 * temperature/top_p/budget_tokens (those 400 on 4.8). Depth is set with `effort`. Output is
 * re-validated through the SAME Zod schema, and usage is read from the response (fail loud if absent).
 *
 * We STREAM and await `finalMessage()` rather than call `messages.parse()`: a whole `game.js`
 * authored at a large `max_tokens` can run past the SDK's ~10-minute non-streaming idle-drop guard,
 * which throws before the call ("Streaming is required for operations that may take longer than 10
 * minutes"). Streaming has no such ceiling. `output_config.format` guarantees the first text block is
 * schema-valid JSON, so we parse it ourselves (no `parsed_output` helper on the stream path).
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
      const stream = this.client.messages.stream(
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
      res = await stream.finalMessage();
    } catch (err) {
      throw new ProviderError(
        `Claude request failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    const usage = extractUsage(res.usage);

    // `output_config.format` makes the first text block the structured JSON payload.
    const textBlock = res.content.find((b) => b.type === 'text');
    if (textBlock?.type !== 'text') {
      throw new SchemaValidationError(
        `Claude returned no text output (stop_reason=${res.stop_reason ?? 'unknown'})`,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      throw new SchemaValidationError(
        `Claude output was not valid JSON, likely truncated (stop_reason=${res.stop_reason ?? 'unknown'})`,
      );
    }

    // Re-validate through the same Zod path as the mock provider — single source of truth.
    const data = schema.parse(parsed);
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
