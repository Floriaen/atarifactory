import { useEffect, useRef } from 'react';
import type { LogLine } from '../lib/useRun';

export function LogView({ logs }: { logs: LogLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="logview" ref={ref}>
      {logs.length === 0 ? (
        <div className="log-empty">No activity yet.</div>
      ) : (
        logs.map((l, i) => (
          <div key={i} className={`log-line ${l.level}`}>
            {l.text}
          </div>
        ))
      )}
    </div>
  );
}
