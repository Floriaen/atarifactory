import { useEffect, useState } from 'react';
import { getDesigns, getModels } from './lib/api';
import { useRun } from './lib/useRun';
import type { DesignSource, GameDefinition, Models, SpritePack } from './lib/types';
import { ModelSelect } from './components/ModelSelect';
import { PhasePanel } from './components/PhasePanel';
import { DesignPreview } from './components/DesignPreview';
import { ArtPreview } from './components/ArtPreview';

export default function App() {
  const [models, setModels] = useState<Models>();
  const [designs, setDesigns] = useState<DesignSource[]>([]);

  const [dProvider, setDProvider] = useState('claude');
  const [dTier, setDTier] = useState('default');
  const [aProvider, setAProvider] = useState('claude');
  const [aTier, setATier] = useState('default');
  const [artSource, setArtSource] = useState('');

  const design = useRun();
  const art = useRun();

  const refreshDesigns = () =>
    getDesigns().then((d) => {
      setDesigns(d);
      setArtSource((cur) => cur || (d[0] ? `${d[0].kind}:${d[0].traceId}` : ''));
    });

  useEffect(() => {
    getModels().then(setModels);
    refreshDesigns();
  }, []);

  // When a design completes, register it as the preferred art source.
  useEffect(() => {
    if (design.state.result?.kind === 'design') {
      getDesigns().then((d) => {
        setDesigns(d);
        const run = d.find((x) => x.kind === 'run');
        if (run) setArtSource(`${run.kind}:${run.traceId}`);
      });
    }
  }, [design.state.result]);

  const runDesign = () =>
    design.start('/api/run/design', { provider: dProvider, modelTier: dTier });

  const runArt = () => {
    const [kind, traceId] = artSource.split(/:(.+)/);
    art.start('/api/run/art', { provider: aProvider, modelTier: aTier, source: { kind, traceId } });
  };

  const designGame = design.state.result?.artifact as GameDefinition | undefined;
  const artPack = art.state.result?.artifact as SpritePack | undefined;

  return (
    <div className="app">
      <h1>Game Factory — Admin</h1>

      <PhasePanel
        title="Design"
        state={design.state}
        controls={
          <>
            <ModelSelect models={models} provider={dProvider} tier={dTier} onProvider={setDProvider} onTier={setDTier} disabled={design.state.running} />
            <button className="run" onClick={runDesign} disabled={design.state.running}>
              {design.state.running ? 'Running…' : 'Run Design'}
            </button>
          </>
        }
      >
        {designGame ? <DesignPreview game={designGame} /> : <div className="muted">Run the design phase to generate a game.</div>}
      </PhasePanel>

      <PhasePanel
        title="Art"
        state={art.state}
        controls={
          <>
            <ModelSelect models={models} provider={aProvider} tier={aTier} onProvider={setAProvider} onTier={setATier} disabled={art.state.running} />
            <label className="source-select">
              Source
              <select value={artSource} onChange={(e) => setArtSource(e.target.value)} disabled={art.state.running}>
                {designs.length === 0 && <option value="">no designs yet</option>}
                {designs.map((d) => (
                  <option key={`${d.kind}:${d.traceId}`} value={`${d.kind}:${d.traceId}`}>
                    {d.title} [{d.kind}]
                  </option>
                ))}
              </select>
            </label>
            <button className="run" onClick={runArt} disabled={art.state.running || !artSource}>
              {art.state.running ? 'Running…' : 'Run Art'}
            </button>
          </>
        }
      >
        {artPack ? <ArtPreview pack={artPack} /> : <div className="muted">Run the art phase to render sprites.</div>}
      </PhasePanel>
    </div>
  );
}
