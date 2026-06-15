/**
 * The wire protocol shared by every host that talks to the factory — the single
 * place the stream's shape is defined. Both the in-process `Observer.sink` seam
 * and the network hop (pipeline service → admin → browser) reference these types,
 * so the three formerly-divergent copies (`events.ts`, the admin `bus.ts`
 * terminal, `web/lib/types.ts`) collapse to one source of truth.
 *
 * Zero runtime, zero deps — pure type declarations.
 */

/** Token usage, read from the provider response — never estimated. */
export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

/**
 * The factory's consumer-facing event stream. A generic, transport- and
 * consumer-agnostic structured signal that ANY host (CLI, admin UI, pipeline
 * service, tests) can subscribe to without depending on the logger (pino) or its
 * line format. The factory emits these; it never knows who listens.
 */
export type FactoryEvent =
  | { type: 'node_start'; node: string }
  | { type: 'node_end'; node: string; ms: number }
  | { type: 'node_error'; node: string; ms: number; error: string }
  | { type: 'llm_call'; node: string; model: string; usage: Usage; costUsd: number; latencyMs: number }
  | { type: 'progress'; name: string; label?: string };

/** What a run produced — minted where the artifact is born (the pipeline service). */
export type DoneEvent = {
  type: 'done';
  traceId: string;
  kind: 'design' | 'art' | 'code';
  artifact: unknown;
  usage: unknown;
};

/** A run that failed mid-stream (the HTTP response already carried a 200). */
export type ErrorEvent = { type: 'error'; message: string };

/** The host-/service-minted terminal events laid on top of the factory stream. */
export type TerminalEvent = DoneEvent | ErrorEvent;

/** The full NDJSON line protocol: factory events, terminated by a `done` or `error`. */
export type StreamEvent = FactoryEvent | TerminalEvent;
