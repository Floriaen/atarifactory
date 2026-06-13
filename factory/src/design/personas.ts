export interface Persona {
  name: string;
  brief: string;
}

/** A pool larger than N so personas don't become their own clichés (sampled per run). */
export const PERSONAS: Persona[] = [
  { name: 'speedrunner', brief: 'obsessed with tight, fast, skill-expressing loops and optimization' },
  { name: 'toy-maker', brief: 'wants a delightful toy you enjoy fiddling with, win or lose' },
  { name: 'troll', brief: 'loves subverting expectations and playful, fair cruelty' },
  { name: 'minimalist', brief: 'strips everything down to one elegant idea' },
  { name: 'one-button', brief: 'designs around a single input that does everything' },
  { name: 'arcade-purist', brief: 'escalating difficulty and a high-score chase — just one more go' },
  { name: 'physicist', brief: 'fun emerges from one simple physical rule: gravity, momentum, bounce' },
];

/** Deterministic when `personas` is supplied (tests); otherwise samples the pool. */
export function samplePersonas(n: number, pool: Persona[] = PERSONAS): Persona[] {
  const count = Math.min(n, pool.length);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
