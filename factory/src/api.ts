/**
 * The factory's PUBLIC API — the single, stable surface every host imports.
 *
 * Hosts (the CLIs in `bin/`, the admin UI, tests) depend ONLY on this module and
 * the generic seams it exposes — never on internal paths. In return, the factory
 * depends on NO consumer: there is no admin/UI/CLI-specific type, parameter, or
 * import anywhere under `src/`. See `docs/consumer-boundary.md`.
 *
 * The seams a host drives the factory through:
 *  - `selectProvider` / `LLMProvider`  — which model backend runs (DIP).
 *  - phase `…Deps.modelOverride`        — force a model/effort tier, generically.
 *  - `Observer` + `FactorySink`         — live structured events (progress/logs/cost).
 *  - the contracts + parse guards       — the data crossing every boundary.
 */

// ── Phases (the verbs a host runs) ──────────────────────────────────────────
export { runDesignPhase } from './design/runDesignPhase.js';
export type { DesignDeps, DesignResult } from './design/runDesignPhase.js';
export { runArtPhase } from './art/runArtPhase.js';
export type { ArtDeps, ArtResult } from './art/runArtPhase.js';
export { maskToAscii } from './art/asciiPreview.js';

// ── Contracts (the data crossing boundaries) ────────────────────────────────
export { GameDefinitionV1, parseGameDefinition } from './contracts/gameDefinition.js';
export type { GameDefinition } from './contracts/gameDefinition.js';
export { SpritePackV1, parseSpritePack } from './contracts/spritePack.js';
export type { SpritePack, SpriteItem, SpriteMask } from './contracts/spritePack.js';
export type { SpriteDsl } from './contracts/artSchemas.js';

// ── Provider seam (which backend runs) ──────────────────────────────────────
export { selectProvider } from './llm/selectProvider.js';
export type { ProviderName } from './llm/selectProvider.js';
export type { LLMProvider } from './llm/provider.js';

// ── Model metadata (for a host's model selector) ────────────────────────────
export { PRESETS, OPUS_MODEL, SONNET_MODEL, DEFAULT_MODEL, resolveModelConfig } from './llm/models.js';
export type { ModelConfig, TaskPreset } from './llm/models.js';

// ── Observability (build a run; subscribe to it) ────────────────────────────
export { Observer } from './observability/observer.js';
export { UsageAggregator } from './observability/usage.js';
export { RunStore } from './observability/runStore.js';
export { ProgressTracker } from './observability/progress.js';
export { createRunContext } from './observability/runContext.js';
export { createLogger, withTrace } from './observability/logger.js';
export type { Logger } from './observability/logger.js';
export type { FactoryEvent, FactorySink } from './observability/events.js';
export type { ProgressEvent } from './observability/progress.js';
export type { UsageTotals } from './observability/usage.js';
export type { RunContext } from './observability/runContext.js';
