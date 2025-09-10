import { v4 as uuidv4 } from 'uuid';

const MAX_TRACES = Number(process.env.DEV_TRACE_BUFFER || 200);
const MAX_EVENTS = Number(process.env.DEV_EVENTS_BUFFER || 300);

const state = {
  llmTraces: [],
  pipelineEvents: [],
  lastAt: null,
};

function enabled() {
  return process.env.ENABLE_DEBUG === '1';
}

function traceEnabled() {
  return enabled() && process.env.ENABLE_DEV_TRACE === '1';
}

function sampleHit() {
  const rate = Number(process.env.DEV_TRACE_SAMPLE || 1);
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return Math.random() < rate;
}

export function addLlmTrace(entry) {
  if (!traceEnabled()) return;
  if (!sampleHit()) return;
  const now = new Date().toISOString();
  const id = uuidv4();
  const record = { id, timestamp: now, ...entry };
  state.llmTraces.push(record);
  if (state.llmTraces.length > MAX_TRACES) state.llmTraces.shift();
  state.lastAt = now;
}

export function addPipelineEvent(event) {
  if (!enabled()) return;
  const now = new Date().toISOString();
  const id = uuidv4();
  const record = { id, timestamp: now, ...event };
  state.pipelineEvents.push(record);
  if (state.pipelineEvents.length > MAX_EVENTS) state.pipelineEvents.shift();
  state.lastAt = now;
}

export function getHealth() {
  return {
    ok: true,
    enabled: enabled(),
    traceEnabled: traceEnabled(),
    bufferSize: MAX_TRACES,
    count: state.llmTraces.length,
    lastAt: state.lastAt,
  };
}

export function listTraces({ chain, traceId, limit = 50, since }) {
  let list = state.llmTraces;
  if (chain) list = list.filter(t => t.chain === chain);
  if (traceId) list = list.filter(t => t.traceId === traceId);
  if (since) list = list.filter(t => t.timestamp > since);
  list = list.slice(-Number(limit || 50));
  // Default: send compact form
  return list.map(({ hydratedPrompt, output, ...rest }) => rest);
}

export function getTrace(id, opts = {}) {
  const entry = state.llmTraces.find(t => t.id === id);
  if (!entry) return null;
  if (opts.full === '1' || opts.full === true) return entry;
  const { hydratedPrompt, output, ...rest } = entry;
  return rest;
}

export function listPipelineEvents({ limit = 200 } = {}) {
  return state.pipelineEvents.slice(-Number(limit || 200));
}

