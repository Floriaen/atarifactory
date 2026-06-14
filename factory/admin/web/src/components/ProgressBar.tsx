interface Props {
  running: boolean;
  done: boolean;
  currentNode?: string;
  stepsDone: number;
}

export function ProgressBar({ running, done, currentNode, stepsDone }: Props) {
  const status = done ? 'done' : running ? (currentNode ?? 'working…') : 'idle';
  return (
    <div className="progress">
      <div className={`bar ${running ? 'running' : ''} ${done ? 'complete' : ''}`}>
        <span />
      </div>
      <div className="progress-meta">
        <span>{status}</span>
        <span>{stepsDone} steps</span>
      </div>
    </div>
  );
}
