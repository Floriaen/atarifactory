// Minimal mirrors of the factory's published contracts — only the fields the UI
// renders. The factory contracts remain the source of truth; these keep the web
// self-contained (no deep cross-package type imports).

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  calls: number;
}

export type StreamEvent =
  | { type: 'node_start'; node: string }
  | { type: 'node_end'; node: string; ms: number }
  | { type: 'node_error'; node: string; ms: number; error: string }
  | { type: 'llm_call'; node: string; model: string; costUsd: number; latencyMs: number }
  | { type: 'progress'; name: string; label?: string }
  | { type: 'done'; traceId: string; kind: 'design' | 'art'; artifact: unknown; usage: UsageTotals }
  | { type: 'error'; message: string };

export interface GameDefinition {
  title: string;
  description: string;
  coreVerb: string;
  hook: string;
  loop: string;
  mechanics: Array<{ name: string; description: string }>;
  entities: Array<{ id: string; role: string; description: string }>;
  goal: { type: string; description: string; target?: string | number; forSeconds?: number };
  controls: { scheme: string; bindings: Array<{ input: string; action: string }> };
  spatial: { orientation: 'portrait' | 'landscape' };
  estimatedPlaytimeSec: number;
}

export interface SpriteItem {
  gridSize: number;
  frames: boolean[][][];
}
export interface SpritePack {
  items: Record<string, SpriteItem>;
}

export interface Models {
  providers: string[];
  tiers: Array<{ id: string; label: string; model?: string }>;
}

export type DesignSource = { kind: 'run' | 'cache'; traceId: string; title: string };
