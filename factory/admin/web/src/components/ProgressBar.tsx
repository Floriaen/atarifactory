import { progressPct } from '../lib/progress';

interface Props {
  running: boolean;
  done: boolean;
  currentNode?: string;
  stepsDone: number;
}

export function ProgressBar({ running, done, currentNode, stepsDone }: Props) {
  const status = done ? 'done' : running ? (currentNode ?? 'working…') : 'idle';
  const pct = progressPct(currentNode, stepsDone, done);
  const indeterminate = running && pct === 0; // run started, first node not in yet
  return (
    <div className="progress">
      <div className={`bar ${indeterminate ? 'indeterminate' : ''} ${done ? 'complete' : ''}`}>
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="progress-meta">
        <span>{status}</span>
        <span>{running || done ? `${Math.round(pct * 100)}%` : `${stepsDone} steps`}</span>
      </div>
    </div>
  );
}
