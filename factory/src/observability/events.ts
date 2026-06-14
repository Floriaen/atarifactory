import type { Usage } from '../llm/provider.js';

/**
 * The factory's consumer-facing event stream. A generic, transport- and
 * consumer-agnostic structured signal that ANY host (CLI, admin UI, tests) can
 * subscribe to without depending on the logger (pino) or its line format.
 *
 * The factory emits these; it never knows who listens. Hosts adapt them to their
 * own surface (SSE, a TUI, an assertion) — this is the single seam for live
 * progress/logs/cost, so no consumer-specific code ever lands in `src/`.
 */
export type FactoryEvent =
  | { type: 'node_start'; node: string }
  | { type: 'node_end'; node: string; ms: number }
  | { type: 'node_error'; node: string; ms: number; error: string }
  | { type: 'llm_call'; node: string; model: string; usage: Usage; costUsd: number; latencyMs: number }
  | { type: 'progress'; name: string; label?: string };

/** A host's subscription to {@link FactoryEvent}s. Synchronous, never throws into core. */
export type FactorySink = (event: FactoryEvent) => void;
