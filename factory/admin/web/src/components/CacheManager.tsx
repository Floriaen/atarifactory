import { useCallback, useEffect, useState } from 'react';
import { deleteRun, getRun, listRuns } from '../lib/api';
import type { CachedRunMeta, RunArtifacts } from '../lib/types';
import { DesignPreview } from './DesignPreview';
import { ArtPreview } from './ArtPreview';
import { CodePreview } from './CodePreview';

const fmtDate = (ms?: number) => (ms ? new Date(ms).toLocaleString() : '');

/**
 * The Cache Manager: browse every persisted run (disk runs + the batch design cache) and
 * review its design, review its art, play the generated game, or delete it. Reuses the same
 * preview components the live phase panels use.
 */
export function CacheManager({ reloadSignal }: { reloadSignal: number }) {
  const [runs, setRuns] = useState<CachedRunMeta[]>([]);
  const [openId, setOpenId] = useState<string>();
  const [artifacts, setArtifacts] = useState<RunArtifacts>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(() => listRuns().then(setRuns).catch((e) => setError(String(e))), []);

  useEffect(() => {
    void refresh();
  }, [refresh, reloadSignal]);

  const open = async (meta: CachedRunMeta) => {
    setError(undefined);
    if (openId === meta.traceId) {
      setOpenId(undefined);
      setArtifacts(undefined);
      return;
    }
    try {
      const run = await getRun(meta.traceId);
      setArtifacts(run);
      setOpenId(meta.traceId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (meta: CachedRunMeta) => {
    if (!window.confirm(`Delete "${meta.title}" (${meta.traceId})? This removes it from disk.`)) return;
    try {
      await deleteRun(meta.traceId);
      if (openId === meta.traceId) {
        setOpenId(undefined);
        setArtifacts(undefined);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="panel cache-manager">
      <div className="panel-head">
        <h2>Library ({runs.length})</h2>
        <button className="run" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {error && <div className="log-line error">{error}</div>}

      {runs.length === 0 ? (
        <div className="muted">No saved runs yet. Generate a design, art, or game below.</div>
      ) : (
        <ul className="cache-list">
          {runs.map((r) => {
            const isOpen = openId === r.traceId;
            const action = r.kind === 'code' ? 'Play' : 'Review';
            return (
              <li key={r.traceId} className={`cache-row ${isOpen ? 'open' : ''}`}>
                <div className="cache-meta">
                  <b className="cache-title">{r.title}</b>
                  <span className={`tag kind-${r.kind}`}>{r.kind}</span>
                  <span className="tag source">{r.source}</span>
                  {r.kind === 'code' && (
                    <span className={`tag ${r.passed ? 'ok' : 'bad'}`}>{r.passed ? 'passed' : 'sub-bar'}</span>
                  )}
                  <span className="muted cache-date">{fmtDate(r.createdAt)}</span>
                </div>
                <div className="cache-actions">
                  <button onClick={() => void open(r)}>{isOpen ? 'Close' : action}</button>
                  <button className="danger" onClick={() => void remove(r)}>
                    Delete
                  </button>
                </div>

                {isOpen && artifacts?.traceId === r.traceId && (
                  <div className="cache-detail">
                    {artifacts.bundle && artifacts.report ? (
                      <CodePreview artifact={{ report: artifacts.report, bundle: artifacts.bundle }} />
                    ) : artifacts.pack ? (
                      <ArtPreview pack={artifacts.pack} />
                    ) : (
                      <DesignPreview game={artifacts.game} />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
