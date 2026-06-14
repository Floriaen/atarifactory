import type { LLMProvider } from '../llm/provider.js';
import type { Observer } from '../observability/observer.js';
import { OPUS_MODEL, type ModelConfig } from '../llm/models.js';
import type { GameDefinition } from '../contracts/gameDefinition.js';
import type { GameBundle } from '../contracts/gameBundle.js';
import type { CodeReport } from '../contracts/codeSchemas.js';
import { codeReviewChain } from './chains/index.js';
import { runSandbox, type SandboxResult } from './sandbox.js';

export interface GateDeps {
  provider: LLMProvider;
  observer: Observer;
  modelOverride?: Partial<ModelConfig>;
}

/** Compile `game.js` (no execution) — true unless it throws a SyntaxError. */
export function checkSyntax(js: string): boolean {
  try {
    new Function(js);
    return true;
  } catch {
    return false;
  }
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
  const syntax = checkSyntax(js);
  if (!syntax) issues.push('syntax: game.js does not compile (SyntaxError)');

  const lintIssues = lintGameJs(js, entityIds);
  const lint = lintIssues.length === 0;
  issues.push(...lintIssues);

  let sandbox: SandboxResult | undefined;
  if (syntax) sandbox = await runSandbox(bundle);
  const smoke = !!sandbox?.ok;
  if (syntax && !smoke) issues.push(`smoke: game threw while loading/running idle frames (${sandbox?.error ?? 'unknown'})`);

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
    });
    const { data } = await review.run({ game, js });
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
