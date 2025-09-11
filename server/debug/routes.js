import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getHealth, listTraces, getTrace, listPipelineEvents } from './traceBuffer.js';
import { ChatOpenAI } from '@langchain/openai';
import { createSpriteMaskGenerator } from '../agents/chains/art/SpriteMaskGenerator.js';
import { createSharedState } from '../types/SharedState.js';

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
// Sprite debug page (LLM sprite generator test UI)
router.use('/llm-sprites', express.static(path.join(__dirname, 'llm-sprites')));

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

// GET /debug/sprites/generate?name=<entity>&grid=12
router.get('/sprites/generate', async (req, res) => {
  try {
    const name = String(req.query.name || '').trim();
    const grid = Number(req.query.grid || 12) || 12;
    if (!name) return res.status(400).json({ ok: false, error: 'name is required' });
    const sharedState = createSharedState();
    const model = process.env.OPENAI_MODEL;
    if (!model) return res.status(500).json({ ok: false, error: 'OPENAI_MODEL must be set' });
    const llm = new ChatOpenAI({ model, temperature: 0 });
    const agent = await createSpriteMaskGenerator(llm, { sharedState });
    const mask = await agent.generate(name, { gridSize: grid });
    res.json({ ok: true, mask });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'sprite generation failed' });
  }
});

export default router;
