import type { LLMProvider } from '../llm/provider.js';
import type { Observer } from '../observability/observer.js';
import { withNode } from '../observability/withNode.js';
import type { ModelConfig } from '../llm/models.js';
import { parseGameDefinition, type GameDefinition } from '@game-factory/contracts';
import { parseSpritePack, type SpritePack } from '@game-factory/contracts';
import type { GameBundle } from '@game-factory/contracts';
import type { CodeReport } from '@game-factory/contracts';
import { codeGenChain, codeFixChain } from './chains/index.js';
import { assembleGameBundle } from './assembleGameBundle.js';
import { gate, type GateDeps } from './gate.js';
import { RUNTIME_CONTRACT } from './runtimeContract.js';

export interface CodeDeps {
  provider: LLMProvider;
  observer: Observer;
  /** Generic, host-driven model override applied to every coding chain. */
  modelOverride?: Partial<ModelConfig>;
  /** Host cancellation, threaded into every coding/gate chain's LLM call (abort-on-disconnect). */
  signal?: AbortSignal;
  /** Repair attempts after the first generation (default 3). */
  maxIterations?: number;
}

export interface CodeResult {
  bundle: GameBundle;
  report: CodeReport;
}

const DEFAULT_MAX_ITERATIONS = 3;
/** Output-token budget for authoring/repairing `game.js` (a full file, not a sprite/draft). */
const CODE_MAX_TOKENS = 16000;

interface Candidate {
  js: string;
  bundle: GameBundle;
  report: CodeReport;
}

/** The hard floor — the only tier that gates the phase: it compiles, lints, and loads+runs. */
function floorPassed(r: CodeReport): boolean {
  return r.checks.syntax && r.checks.lint && r.checks.smoke;
}

/**
 * Keep-best ranking (higher wins): a passing hard floor dominates everything, then more soft
 * checks satisfied, then fewer issues. Mirrors the design phase's `candidateScore` intent.
 */
function candidateScore(r: CodeReport): number {
  const floor = floorPassed(r) ? 1 : 0;
  const soft = [r.checks.interaction, r.checks.progression, r.checks.faithful].filter(Boolean).length;
  return floor * 1000 + soft * 10 - r.issues.length;
}

/**
 * The coding phase (mirrors `runArtPhase` + the design refine/keep-best loop). From a validated
 * `{ game, pack }`, autonomously author `game.js`, assemble a `GameBundle`, and judge it through
 * the gate; on failure, feed every failing check back to the LLM and re-judge, keeping the best
 * candidate across iterations. Returns `{ bundle, report }` — the best attempt plus its verdict —
 * and throws ONLY when no loading bundle can be produced (the `runDesignPhase` `!best` analog).
 */
export async function runCodePhase(game: GameDefinition, pack: SpritePack, deps: CodeDeps): Promise<CodeResult> {
  const def = parseGameDefinition(game); // read guard
  const sprites = parseSpritePack(pack); // read guard
  const maxIterations = deps.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  const gateDeps: GateDeps = { provider: deps.provider, observer: deps.observer, modelOverride: deps.modelOverride, signal: deps.signal };
  // A whole `game.js` is far longer than a sprite/draft: the `structured` preset's 2048-token cap
  // truncates it mid-string (Unterminated JSON). Raise the authoring/repair output budget; an
  // explicit host modelOverride still wins (spread last).
  const authoring: Partial<ModelConfig> = { maxTokens: CODE_MAX_TOKENS, ...deps.modelOverride };
  const gen = codeGenChain({ provider: deps.provider, observer: deps.observer, modelOverride: authoring, signal: deps.signal });
  const fix = codeFixChain({ provider: deps.provider, observer: deps.observer, modelOverride: authoring, signal: deps.signal });
  const spriteNames = def.entities.map((e) => e.id);

  const evaluate = async (js: string): Promise<Candidate> => {
    const bundle = await assembleGameBundle(def, sprites, js);
    const report = await gate({ game: def, js, bundle }, gateDeps);
    return { js, bundle, report };
  };

  let current = await withNode(deps.observer, 'code:generate', async () => {
    const { data } = await gen.run({ game: def, spriteNames, runtimeContract: RUNTIME_CONTRACT });
    return evaluate(data.js);
  });
  let best = current;

  for (let iteration = 1; !current.report.passed && iteration <= maxIterations; iteration++) {
    const priorJs = current.js;
    const issues = current.report.issues.length
      ? current.report.issues.join('\n')
      : 'the game did not pass the quality gate';
    current = await withNode(deps.observer, `code:fix#${iteration}`, async () => {
      const { data } = await fix.run({ game: def, priorJs, issues });
      return evaluate(data.js);
    });
    if (candidateScore(current.report) > candidateScore(best.report)) best = current;
  }

  deps.observer.progress('done', def.title);

  // Fail loud only when nothing even loads — a sub-bar-but-running game returns for the host to judge.
  if (!floorPassed(best.report)) {
    throw new Error(
      `runCodePhase: no loading bundle could be produced for "${def.title}" — best candidate still fails the hard floor (${best.report.issues.join('; ')})`,
    );
  }

  return { bundle: best.bundle, report: best.report };
}
