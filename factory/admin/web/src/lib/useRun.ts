import { useCallback, useRef, useState } from 'react';
import { openStream, postRun } from './api';
import type { PhaseKind, StreamEvent, UsageTotals } from './types';

export interface LogLine {
  text: string;
  level: 'info' | 'error';
}

export interface RunState {
  running: boolean;
  currentNode?: string;
  stepsDone: number;
  logs: LogLine[];
  costUsd: number;
  result?: { kind: PhaseKind; artifact: unknown; usage: UsageTotals };
  error?: string;
}

const INITIAL: RunState = { running: false, stepsDone: 0, logs: [], costUsd: 0 };

export function useRun() {
  const [state, setState] = useState<RunState>(INITIAL);
  const closeRef = useRef<(() => void) | null>(null);

  const onEvent = useCallback((e: StreamEvent) => {
    setState((s) => {
      switch (e.type) {
        case 'node_start':
          return { ...s, currentNode: e.node, logs: [...s.logs, { text: `▶ ${e.node}`, level: 'info' }] };
        case 'node_end':
          return { ...s, stepsDone: s.stepsDone + 1, logs: [...s.logs, { text: `✓ ${e.node} (${e.ms}ms)`, level: 'info' }] };
        case 'node_error':
          return { ...s, logs: [...s.logs, { text: `✗ ${e.node}: ${e.error}`, level: 'error' }] };
        case 'llm_call':
          return {
            ...s,
            costUsd: s.costUsd + e.costUsd,
            logs: [...s.logs, { text: `  ↳ ${e.node} · ${e.model} · $${e.costUsd.toFixed(4)}`, level: 'info' }],
          };
        case 'progress':
          return { ...s, logs: [...s.logs, { text: `• ${e.name}${e.label ? `: ${e.label}` : ''}`, level: 'info' }] };
        case 'done':
          return { ...s, running: false, currentNode: undefined, costUsd: e.usage.costUsd, result: { kind: e.kind, artifact: e.artifact, usage: e.usage } };
        case 'error':
          return { ...s, running: false, currentNode: undefined, error: e.message, logs: [...s.logs, { text: `✗ ${e.message}`, level: 'error' }] };
        default:
          return s;
      }
    });
  }, []);

  const start = useCallback(
    async (path: string, body: unknown) => {
      closeRef.current?.();
      setState({ ...INITIAL, running: true });
      try {
        const { traceId } = await postRun(path, body);
        closeRef.current = openStream(traceId, onEvent);
      } catch (err) {
        setState({ ...INITIAL, error: err instanceof Error ? err.message : String(err) });
      }
    },
    [onEvent],
  );

  return { state, start };
}
