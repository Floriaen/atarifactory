import { useEffect, useState } from 'react';
import { getArts, getDesigns, getModels } from './lib/api';
import { useRun } from './lib/useRun';
import type { ArtSource, CodeArtifact, DesignSource, GameDefinition, Models, SpritePack } from './lib/types';
import { ModelSelect } from './components/ModelSelect';
import { PhasePanel } from './components/PhasePanel';
import { DesignPreview } from './components/DesignPreview';
import { ArtPreview } from './components/ArtPreview';
import { CodePreview } from './components/CodePreview';

export default function App() {
  const [models, setModels] = useState<Models>();
  const [designs, setDesigns] = useState<DesignSource[]>([]);
  const [arts, setArts] = useState<ArtSource[]>([]);

  const [dProvider, setDProvider] = useState('claude');
  const [dTier, setDTier] = useState('default');
  const [aProvider, setAProvider] = useState('claude');
  const [aTier, setATier] = useState('default');
  const [artSource, setArtSource] = useState('');
  const [cProvider, setCProvider] = useState('claude');
  const [cTier, setCTier] = useState('default');
  const [codeSource, setCodeSource] = useState('');

  const design = useRun();
  const art = useRun();
  const code = useRun();

  const refreshDesigns = () =>
    getDesigns().then((d) => {
      setDesigns(d);
      setArtSource((cur) => cur || (d[0] ? `${d[0].kind}:${d[0].traceId}` : ''));
    });

  const refreshArts = () => getArts().then(setArts);

  useEffect(() => {
    getModels().then(setModels);
    refreshDesigns();
    refreshArts();
  }, []);

  // The code phase can start from an art result (sprites ready) OR a design (sprites generated
  // inline). Offer both — so a cached game that has no art run yet is still a one-click playable game.
  const codeOptions = [
    ...arts.map((a) => ({
      value: `art-${a.kind}:${a.traceId}`,
      label: `${a.title} — sprites ${a.kind === 'run' ? '(session)' : '(cached)'}`,
    })),
    ...designs.map((d) => ({
      value: `design-${d.kind}:${d.traceId}`,
      label: `${d.title} — design ${d.kind === 'cache' ? '(cached)' : '(session)'} → art+code`,
    })),
  ];

  // Default the code source once inputs load (prefer an art result, else a design).
  useEffect(() => {
    setCodeSource((cur) => {
      if (cur) return cur;
      if (arts[0]) return `art-${arts[0].kind}:${arts[0].traceId}`;
      if (designs[0]) return `design-${designs[0].kind}:${designs[0].traceId}`;
      return '';
    });
  }, [arts, designs]);

  // A completed design becomes the preferred art source (design→art chaining).
  useEffect(() => {
    if (design.state.result?.kind === 'design') {
      getDesigns().then((d) => {
        setDesigns(d);
        const run = d.find((x) => x.kind === 'run');
        if (run) setArtSource(`${run.kind}:${run.traceId}`);
      });
    }
  }, [design.state.result]);

  // A completed art run becomes the preferred code source (art→code chaining).
  useEffect(() => {
    if (art.state.result?.kind === 'art') {
      getArts().then((a) => {
        setArts(a);
        const run = a.find((x) => x.kind === 'run');
        if (run) setCodeSource(`art-${run.kind}:${run.traceId}`);
      });
    }
  }, [art.state.result]);

  const runDesign = () => design.start('/api/run/design', { provider: dProvider, modelTier: dTier });

  const runArt = () => {
    const [kind, traceId] = artSource.split(/:(.+)/);
    art.start('/api/run/art', { provider: aProvider, modelTier: aTier, source: { kind, traceId } });
  };

  const runCode = () => {
    const [kind, traceId] = codeSource.split(/:(.+)/);
    code.start('/api/run/code', { provider: cProvider, modelTier: cTier, source: { kind, traceId } });
  };

  const designGame = design.state.result?.artifact as GameDefinition | undefined;
  const artPack = art.state.result?.artifact as SpritePack | undefined;
  const codeArtifact = code.state.result?.kind === 'code' ? (code.state.result.artifact as CodeArtifact) : undefined;

  return (
    <div className="app">
      <h1>Game Factory — Admin</h1>
      <p className="muted pipeline">design → art → code · each phase runs from a fresh result or a previously cached one</p>

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
              Source (design)
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

      <PhasePanel
        title="Code"
        state={code.state}
        controls={
          <>
            <ModelSelect models={models} provider={cProvider} tier={cTier} onProvider={setCProvider} onTier={setCTier} disabled={code.state.running} />
            <label className="source-select">
              Source (art or design)
              <select value={codeSource} onChange={(e) => setCodeSource(e.target.value)} disabled={code.state.running}>
                {codeOptions.length === 0 && <option value="">no designs or art yet</option>}
                {codeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="run" onClick={runCode} disabled={code.state.running || !codeSource}>
              {code.state.running ? 'Running…' : 'Run Code'}
            </button>
          </>
        }
      >
        {codeArtifact ? (
          <CodePreview artifact={codeArtifact} />
        ) : (
          <div className="muted">Run the code phase to build a playable game and judge it.</div>
        )}
      </PhasePanel>
    </div>
  );
}
