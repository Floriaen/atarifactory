import type { ReactNode } from 'react';
import type { RunState } from '../lib/useRun';
import { ProgressBar } from './ProgressBar';
import { LogView } from './LogView';

interface Props {
  title: string;
  controls: ReactNode;
  state: RunState;
  children?: ReactNode;
}

export function PhasePanel({ title, controls, state, children }: Props) {
  const done = !!state.result;
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>{title}</h2>
        <div className="controls">{controls}</div>
      </header>

      <ProgressBar running={state.running} done={done} currentNode={state.currentNode} stepsDone={state.stepsDone} />
      {state.error && <div className="error-banner">{state.error}</div>}

      <div className="panel-body">
        <LogView logs={state.logs} />
        <div className="preview">
          <div className="cost">cost: ${state.costUsd.toFixed(4)}</div>
          {children}
        </div>
      </div>
    </section>
  );
}
