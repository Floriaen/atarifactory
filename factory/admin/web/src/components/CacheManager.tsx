import { useCallback, useEffect, useState } from 'react';
import { deleteRun, getRun, listRuns } from '../lib/api';
import type { GameArtifacts, GameMeta } from '../lib/types';
import { DesignPreview } from './DesignPreview';
import { ArtPreview } from './ArtPreview';
import { CodePreview } from './CodePreview';

const fmtDate = (ms?: number) => (ms ? new Date(ms).toLocaleString() : '');

/**
 * The Library: one card per game (its design, art, and playable build live in one runs/<gameId>/
 * directory). Open a game to review its design, view its sprites, and play the built game; delete
 * removes the whole game. Reuses the same preview components the live phase panels use.
 */
export function CacheManager({ reloadSignal }: { reloadSignal: number }) {
  const [games, setGames] = useState<GameMeta[]>([]);
  const [openId, setOpenId] = useState<string>();
  const [artifacts, setArtifacts] = useState<GameArtifacts>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(() => listRuns().then(setGames).catch((e) => setError(String(e))), []);

  useEffect(() => {
    void refresh();
  }, [refresh, reloadSignal]);

  const open = async (g: GameMeta) => {
    setError(undefined);
    if (openId === g.gameId) {
      setOpenId(undefined);
      setArtifacts(undefined);
      return;
    }
    try {
      setArtifacts(await getRun(g.gameId));
      setOpenId(g.gameId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (g: GameMeta) => {
    if (!window.confirm(`Delete "${g.title}" (${g.gameId})? This removes its whole directory.`)) return;
    try {
      await deleteRun(g.gameId);
      if (openId === g.gameId) {
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
        <h2>Library ({games.length})</h2>
        <button className="run" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {error && <div className="log-line error">{error}</div>}

      {games.length === 0 ? (
        <div className="muted">No saved games yet. Generate a design, art, or game below.</div>
      ) : (
        <ul className="cache-list">
          {games.map((g) => {
            const isOpen = openId === g.gameId;
            return (
              <li key={g.gameId} className={`cache-row ${isOpen ? 'open' : ''}`}>
                <div className="cache-meta">
                  <b className="cache-title">{g.title}</b>
                  <span className="tag">design</span>
                  {g.hasArt && <span className="tag">art</span>}
                  {g.hasGame && <span className={`tag ${g.passed ? 'ok' : 'bad'}`}>{g.passed ? 'game ✓' : 'game · sub-bar'}</span>}
                  <span className="tag source">{g.source}</span>
                  <span className="muted cache-date">{fmtDate(g.updatedAt)}</span>
                </div>
                <div className="cache-actions">
                  <button onClick={() => void open(g)}>{isOpen ? 'Close' : g.hasGame ? 'Open / Play' : 'Open'}</button>
                  <button className="danger" onClick={() => void remove(g)}>
                    Delete
                  </button>
                </div>

                {isOpen && artifacts?.gameId === g.gameId && (
                  <div className="cache-detail">
                    {artifacts.bundle && artifacts.report && (
                      <section>
                        <h3>Game</h3>
                        <CodePreview artifact={{ report: artifacts.report, bundle: artifacts.bundle }} />
                      </section>
                    )}
                    {artifacts.pack && (
                      <section>
                        <h3>Art</h3>
                        <ArtPreview pack={artifacts.pack} />
                      </section>
                    )}
                    <section>
                      <h3>Design</h3>
                      <DesignPreview game={artifacts.game} />
                    </section>
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
