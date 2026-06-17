/**
 * Map the live run signal (current node + completed steps) to a 0..1 progress fraction.
 *
 * The phases have known, ordered milestones but variable loop counts (design refinement, code
 * fixes), so there's no honest upfront denominator. Instead each milestone gets a weighted band,
 * and the variable loops `creep` asymptotically toward their band ceiling — always advancing,
 * never overflowing, snapping to 1 only on `done`. Node-name prefixes are phase-distinct, so the
 * phase is inferred from `currentNode` alone (no extra plumbing).
 */

/** Ease from `floor` toward (but never reaching) `ceil` as `steps` grows. */
function creep(floor: number, ceil: number, steps: number): number {
  return floor + (ceil - floor) * (1 - Math.pow(0.6, Math.max(0, steps)));
}

export function progressPct(currentNode: string | undefined, stepsDone: number, done: boolean): number {
  if (done) return 1;
  if (!currentNode) return 0; // run started, first node not in yet → indeterminate

  // design
  if (currentNode === 'diverge') return 0.1;
  if (currentNode === 'select') return 0.22;
  if (currentNode.startsWith('elaborate') || currentNode.startsWith('critic')) return creep(0.3, 0.9, stepsDone - 2);

  // art — one sprite per entity
  if (currentNode.startsWith('sprite:')) return creep(0.1, 0.9, stepsDone);

  // code — authoring, then the gate's slow steps (sandbox + faithfulness review), then repair loop
  if (currentNode === 'code:generate') return 0.45;
  if (currentNode === 'code:smoke') return creep(0.55, 0.85, stepsDone);
  if (currentNode === 'code:review') return creep(0.7, 0.92, stepsDone);
  if (currentNode.startsWith('code:fix')) return creep(0.55, 0.9, stepsDone);

  return creep(0.05, 0.9, stepsDone); // unknown node — still advance
}
