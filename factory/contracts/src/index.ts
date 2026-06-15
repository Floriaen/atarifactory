/**
 * `@game-factory/contracts` — the wire shapes the factory and its clients agree
 * on, and NOTHING else. Zod schemas + inferred types + parse guards + the stream
 * protocol. Zero phases, zero llm, zero observability; the only dependency is
 * `zod/v4`.
 *
 * The factory core re-exports this through `src/api.ts`; the pipeline service and
 * the admin import it directly to validate bodies and type artifacts. It is the
 * one versioned contract every boundary crosses.
 */
export * from './gameDefinition.js';
export * from './phaseSchemas.js';
export * from './artSchemas.js';
export * from './spritePack.js';
export * from './codeSchemas.js';
export * from './gameBundle.js';
export * from './stream.js';
export * from './requests.js';
