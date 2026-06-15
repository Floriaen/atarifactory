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

export function createRunContext(opts: {
  gameId?: string;
  model: string;
  devTrace?: boolean;
  /** Adopt a host-minted id (e.g. the admin's `x-run-id`) instead of minting one — for cross-process log correlation. */
  traceId?: string;
}): RunContext {
  const traceId = opts.traceId ?? `run_${Date.now().toString(36)}_${(counter++).toString(36)}`;
  return {
    traceId,
    gameId: opts.gameId ?? traceId,
    model: opts.model,
    devTrace: opts.devTrace ?? false,
    startTime: Date.now(),
  };
}
