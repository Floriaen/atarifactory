import type { ArtSource, DesignSource, GameArtifacts, GameMeta, Models, StreamEvent } from './types';

export async function getModels(): Promise<Models> {
  const r = await fetch('/api/models');
  return r.json();
}

export async function getDesigns(): Promise<DesignSource[]> {
  const r = await fetch('/api/designs');
  return r.json();
}

export async function getArts(): Promise<ArtSource[]> {
  const r = await fetch('/api/arts');
  return r.json();
}

export async function postRun(path: string, body: unknown): Promise<{ traceId: string }> {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const msg = await r.json().catch(() => ({}));
    throw new Error((msg as { error?: string }).error ?? r.statusText);
  }
  return r.json();
}

// ── Cache Manager (one entry per game) ─────────────────────────────────────
export async function listRuns(): Promise<GameMeta[]> {
  const r = await fetch('/api/runs');
  return r.json();
}

export async function getRun(gameId: string): Promise<GameArtifacts> {
  const r = await fetch(`/api/runs/${gameId}`);
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? r.statusText);
  return r.json();
}

export async function deleteRun(gameId: string): Promise<void> {
  const r = await fetch(`/api/runs/${gameId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? r.statusText);
}

/** Subscribe to a run's SSE stream. Returns a close fn; auto-closes on done/error. */
export function openStream(traceId: string, onEvent: (e: StreamEvent) => void): () => void {
  const es = new EventSource(`/api/stream/${traceId}`);
  es.onmessage = (m) => {
    const e = JSON.parse(m.data) as StreamEvent;
    onEvent(e);
    if (e.type === 'done' || e.type === 'error') es.close();
  };
  es.onerror = () => es.close();
  return () => es.close();
}
