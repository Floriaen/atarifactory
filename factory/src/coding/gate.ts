import type { LLMProvider } from '../llm/provider.js';
import type { Observer } from '../observability/observer.js';
import { withNode } from '../observability/withNode.js';
import { OPUS_MODEL, type ModelConfig } from '../llm/models.js';
import type { GameDefinition } from '@game-factory/contracts';
import type { GameBundle } from '@game-factory/contracts';
import type { CodeReport } from '@game-factory/contracts';
import { codeReviewChain } from './chains/index.js';
import { runSandbox, type SandboxResult } from './sandbox.js';

export interface GateDeps {
  provider: LLMProvider;
  observer: Observer;
  modelOverride?: Partial<ModelConfig>;
  /** Host cancellation, threaded into the faithfulness-review LLM call (abort-on-disconnect). */
  signal?: AbortSignal;
}

/** Compile `game.js` (no execution). Returns the SyntaxError message, or null if it compiles. */
export function syntaxError(js: string): string | null {
  try {
    new Function(js);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** Compile `game.js` (no execution) — true unless it throws a SyntaxError. */
export function checkSyntax(js: string): boolean {
  return syntaxError(js) === null;
}

const FORBIDDEN: Array<{ re: RegExp; msg: string }> = [
  { re: /\beval\s*\(/, msg: 'forbidden API: eval()' },
  { re: /new\s+Function\s*\(/, msg: 'forbidden API: new Function()' },
  { re: /\bfetch\s*\(/, msg: 'forbidden API: fetch() (no network)' },
  { re: /\bimport\s*\(/, msg: 'forbidden API: dynamic import()' },
  { re: /\bXMLHttpRequest\b/, msg: 'forbidden API: XMLHttpRequest (no network)' },
  { re: /\bWebSocket\b/, msg: 'forbidden API: WebSocket (no network)' },
  { re: /\bimportScripts\s*\(/, msg: 'forbidden API: importScripts()' },
  {
    re: /createLinearGradient|createRadialGradient|createPattern/,
    msg: 'forbidden: gradients/patterns — use solid basic colours only',
  },
  { re: /\bclearRect\s*\(/, msg: "forbidden: clearRect — call drawBackground(ctx[, color]) instead of clearing the canvas yourself" },
  {
    re: /fillRect\s*\(\s*0\s*,\s*0\s*,[^;)]*\.(width|height)\b/,
    msg: "forbidden: full-canvas fill — call drawBackground(ctx) (or drawBackground(ctx, '#rrggbb') for a coloured backdrop) instead of filling the whole canvas yourself",
  },
];

/**
 * Static lint over the `game.js` source. Hard-floor: catches the Atari constraint violations,
 * unsafe APIs, and contract breaches (must poll `gamepadState`, must draw via `renderEntity`,
 * must only pass canonical entity ids). Returns the list of issues (empty ⇒ pass).
 */
export function lintGameJs(js: string, entityIds: string[]): string[] {
  const issues: string[] = [];

  for (const { re, msg } of FORBIDDEN) {
    if (re.test(js)) issues.push(msg);
  }

  if (!/\bgamepadState\b/.test(js)) issues.push('missing: game.js never reads window.gamepadState');
  if (!/\brenderEntity\s*\(/.test(js)) issues.push('missing: game.js never calls renderEntity()');

  const known = new Set(entityIds);
  const callRe = /renderEntity\s*\(\s*[^,]+,\s*(['"])([a-zA-Z0-9_]+)\1/g;
  const seenUnknown = new Set<string>();
  for (let m = callRe.exec(js); m; m = callRe.exec(js)) {
    const id = m[2]!;
    if (!known.has(id) && !seenUnknown.has(id)) {
      seenUnknown.add(id);
      issues.push(`unknown entity id '${id}' passed to renderEntity (allowed: ${entityIds.join(', ')})`);
    }
  }

  return issues;
}

export interface GateInput {
  game: GameDefinition;
  js: string;
  bundle: GameBundle;
}

/**
 * Compute a CodeReport with two tiers of authority. NEVER throws on a bad game (a broken game
 * yields `passed:false`, not an exception). Hard floor — syntax, lint, smoke — are the only checks
 * that gate the phase; interaction, progression, and faithfulness are soft signals that drive the
 * repair loop. Faithfulness (an Opus review) runs only once the hard floor passes.
 */
export async function gate(input: GateInput, deps: GateDeps): Promise<CodeReport> {
  const { game, js, bundle } = input;
  const entityIds = game.entities.map((e) => e.id);
  const issues: string[] = [];

  // ── Hard floor ────────────────────────────────────────────────────────────
  const synErr = syntaxError(js);
  const syntax = synErr === null;
  // Keep the compiler message — an "Unterminated string" here usually means the LLM output was
  // truncated (hit the token cap), which the repair loop can only fix if it's told what broke.
  if (!syntax) issues.push(`syntax: game.js does not compile — ${synErr}`);

  const lintIssues = lintGameJs(js, entityIds);
  const lint = lintIssues.length === 0;
  issues.push(...lintIssues);

  let sandbox: SandboxResult | undefined;
  if (syntax) sandbox = await withNode(deps.observer, 'code:smoke', () => runSandbox(bundle));
  // The floor requires the game to actually render — a game that loads cleanly but never draws
  // (e.g. wrong canvas id → early return) is a blank screen, not a pass.
  const smoke = !!sandbox?.ok && (sandbox?.idleDraws ?? 0) > 0;
  if (syntax && !smoke) {
    const reason = !sandbox?.ok
      ? `threw while loading/running idle frames (${sandbox?.error ?? 'unknown'})`
      : 'loaded but drew nothing (blank screen — check the canvas is found and the render loop runs)';
    issues.push(`smoke: game ${reason}`);
  }

  // ── Soft signals ──────────────────────────────────────────────────────────
  const interaction = !!sandbox && (sandbox.interacted || sandbox.idleDraws !== sandbox.inputDraws);
  if (!interaction) issues.push('interaction: gamepad input did not change what is drawn');

  const progression = !!sandbox && sandbox.movedEntities > 0;
  if (!progression) issues.push('progression: nothing moves or changes over time');

  // Faithfulness rides only on a clean hard floor (don't spend an Opus review on a broken game).
  let faithful = false;
  if (syntax && lint && smoke) {
    const review = codeReviewChain({
      provider: deps.provider,
      observer: deps.observer,
      // Judgement quality, like the design critic — Opus unless the host forced a tier.
      modelOverride: deps.modelOverride ?? { model: OPUS_MODEL, effort: 'medium' },
      signal: deps.signal,
    });
    const { data } = await withNode(deps.observer, 'code:review', () => review.run({ game, js }));
    faithful = data.verdict === 'pass';
    if (!faithful) {
      for (const i of data.issues) issues.push(`faithfulness: ${i.target}: ${i.note}`);
    }
  } else {
    issues.push('faithfulness: skipped (hard floor not yet met)');
  }

  const checks = { syntax, lint, smoke, interaction, progression, faithful };
  const passed = syntax && lint && smoke && interaction && progression && faithful;
  return { passed, checks, issues };
}
