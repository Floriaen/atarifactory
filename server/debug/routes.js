import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getHealth, listTraces, getTrace, listPipelineEvents } from './traceBuffer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

function debugEnabled(req, res, next) {
  if (process.env.ENABLE_DEBUG === '1') return next();
  return res.status(404).send('Not found');
}

router.use(debugEnabled);

// Static dev UI
router.use('/llm', express.static(path.join(__dirname, 'public')));

// APIs
router.get('/llm/health', (req, res) => {
  res.json(getHealth());
});

router.get('/llm/traces', (req, res) => {
  const { chain, traceId, limit, since } = req.query;
  res.json({ ok: true, traces: listTraces({ chain, traceId, limit, since }) });
});

router.get('/llm/trace/:id', (req, res) => {
  const entry = getTrace(req.params.id, { full: req.query.full });
  if (!entry) return res.status(404).json({ ok: false, error: 'Not found' });
  res.json({ ok: true, trace: entry });
});

router.get('/pipeline/events', (req, res) => {
  const { limit } = req.query;
  res.json({ ok: true, events: listPipelineEvents({ limit }) });
});

export default router;

