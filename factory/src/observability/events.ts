/**
 * The factory's consumer-facing event stream. The canonical shape now lives in
 * `@game-factory/contracts` (the one place every host — CLI, admin, pipeline
 * service, browser — agrees on the wire). This module re-exports it and pairs it
 * with the in-process sink seam the {@link Observer} fans out to.
 *
 * The factory emits these; it never knows who listens. Hosts adapt them to their
 * own surface (SSE, NDJSON, a TUI, an assertion) — so no consumer-specific code
 * ever lands in `src/`.
 */
export type { FactoryEvent } from '@game-factory/contracts';
import type { FactoryEvent } from '@game-factory/contracts';

/** A host's subscription to {@link FactoryEvent}s. Synchronous, never throws into core. */
export type FactorySink = (event: FactoryEvent) => void;
