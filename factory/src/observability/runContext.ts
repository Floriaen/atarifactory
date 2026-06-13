export type TraceId = string;

/** Minted once per run and threaded (required) into every node. */
export interface RunContext {
  traceId: TraceId;
  gameId: string;
  model: string;
  devTrace: boolean;
  startTime: number;
}

let counter = 0;

export function createRunContext(opts: { gameId?: string; model: string; devTrace?: boolean }): RunContext {
  const traceId = `run_${Date.now().toString(36)}_${(counter++).toString(36)}`;
  return {
    traceId,
    gameId: opts.gameId ?? traceId,
    model: opts.model,
    devTrace: opts.devTrace ?? false,
    startTime: Date.now(),
  };
}
