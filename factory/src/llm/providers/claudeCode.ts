import { spawn } from 'node:child_process';
import { z, type ZodType } from 'zod/v4';
import type { LLMMessage, LLMProvider, StructuredOptions, StructuredResult, Usage } from '../provider.js';
import { MissingUsageError, ProviderError, SchemaValidationError } from '../errors.js';

/**
 * BLACK BOX. A dev/experimentation provider that routes structured calls through the
 * local Claude Code CLI (`claude -p`) instead of the metered Anthropic API — so batch
 * runs draw on a Claude subscription rather than per-token billing.
 *
 * It honors the LLMProvider contract exactly (schema-constrained structured output,
 * usage from the response, fail-loud) and nothing outside this file knows it exists.
 * All the CLI quirks are sealed here:
 *  - the agent is neutralized (`--tools ""` + a data-only system prompt + single intent)
 *    so Claude Code's coding persona/tools can't leak into the output;
 *  - native structured output via `--json-schema` (Zod → JSON Schema), re-validated
 *    through the SAME Zod schema — the single source of truth;
 *  - usage is read from the CLI's JSON envelope (throws if absent).
 *
 * Caveats (why this is NOT the production path): the CLI controls the model alias (e.g.
 * `opus` may resolve to a different minor than the API's default), `effort` is ignored,
 * and each call carries the CLI's system-prompt overhead + process-spawn latency.
 */

const DATA_ONLY_SYSTEM =
  'You are a structured data generator. Return ONLY data that matches the provided JSON schema. ' +
  'Do not write code, do not use tools, do not explain, do not add commentary.';

interface CliEnvelope {
  is_error?: boolean;
  subtype?: string;
  stop_reason?: string;
  structured_output?: unknown;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  };
  modelUsage?: Record<string, unknown>;
}

export interface ClaudeCodeOptions {
  /** CLI binary; override for tests. */
  bin?: string;
  /** Extra retries when the CLI returns output that fails Zod (agent path is less reliable). */
  maxRetries?: number;
}

export class ClaudeCodeProvider implements LLMProvider {
  readonly name = 'claude-code';
  private readonly bin: string;
  private readonly maxRetries: number;

  constructor(opts: ClaudeCodeOptions = {}) {
    this.bin = opts.bin ?? 'claude';
    this.maxRetries = opts.maxRetries ?? 1;
  }

  async structured<T>(
    schema: ZodType<T>,
    system: string,
    messages: LLMMessage[],
    opts: StructuredOptions,
  ): Promise<StructuredResult<T>> {
    // The CLI's --json-schema silently drops output if the schema carries a top-level
    // `$schema` key (which z.toJSONSchema emits), so strip it.
    const schemaBody = z.toJSONSchema(schema) as Record<string, unknown>;
    delete schemaBody.$schema;
    const jsonSchema = JSON.stringify(schemaBody);
    // The factory's real instruction lives in the user prompt; the CLI system prompt is
    // overridden to a data-only directive (plus the chain's own system, if any).
    const systemPrompt = system ? `${DATA_ONLY_SYSTEM}\n\n${system}` : DATA_ONLY_SYSTEM;
    const prompt = messages.map((m) => m.content).join('\n\n');

    const args = [
      '-p',
      '--output-format', 'json',
      '--tools', '',
      '--model', opts.model,
      '--system-prompt', systemPrompt,
      '--json-schema', jsonSchema,
    ];

    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const env = this.spawnCli(args, prompt, opts.signal);
      const envelope = await env;

      if (envelope.is_error || envelope.structured_output == null) {
        lastErr = new ProviderError(
          `claude CLI returned no structured output (subtype=${envelope.subtype ?? 'unknown'})`,
        );
        continue;
      }
      const parsed = schema.safeParse(envelope.structured_output);
      if (!parsed.success) {
        lastErr = new SchemaValidationError('claude CLI output failed schema validation', parsed.error.issues);
        continue;
      }
      return {
        data: parsed.data,
        usage: extractUsage(envelope.usage),
        model: Object.keys(envelope.modelUsage ?? {})[0] ?? opts.model,
        stopReason: envelope.stop_reason,
        raw: envelope,
      };
    }
    throw lastErr instanceof Error
      ? lastErr
      : new ProviderError('claude CLI failed after retries');
  }

  private spawnCli(args: string[], prompt: string, signal?: AbortSignal): Promise<CliEnvelope> {
    return new Promise<CliEnvelope>((resolve, reject) => {
      // Strip CLAUDECODE so nested-session detection doesn't block, and ANTHROPIC_API_KEY
      // so the call uses the subscription login rather than metered API billing.
      const env = { ...process.env };
      delete env.CLAUDECODE;
      delete env.ANTHROPIC_API_KEY;

      const child = spawn(this.bin, args, { env, signal });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => (stdout += d));
      child.stderr.on('data', (d) => (stderr += d));
      child.on('error', (err) => reject(new ProviderError(`claude CLI spawn failed: ${err.message}`, err)));
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new ProviderError(`claude CLI exited ${code}: ${stderr.slice(0, 500)}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout) as CliEnvelope);
        } catch (err) {
          reject(new ProviderError(`claude CLI returned non-JSON output: ${stdout.slice(0, 300)}`, err));
        }
      });
      child.stdin.end(prompt);
    });
  }
}

/** Read tokens from the CLI envelope. Never estimate — throw if missing (fail loud). */
function extractUsage(u: CliEnvelope['usage']): Usage {
  if (!u || typeof u.input_tokens !== 'number' || typeof u.output_tokens !== 'number') {
    throw new MissingUsageError('claude CLI response is missing token usage');
  }
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadInputTokens: u.cache_read_input_tokens ?? undefined,
    cacheCreationInputTokens: u.cache_creation_input_tokens ?? undefined,
  };
}
