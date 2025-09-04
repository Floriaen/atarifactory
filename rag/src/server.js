import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import buildIndex from './indexer.js';
import { queryIndex } from './search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.RAG_PORT || 4001;

app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  const indexPath = path.resolve(__dirname, '..', 'knowledge', 'index.json');
  const hasIndex = fs.existsSync(indexPath);
  res.json({
    ok: true,
    status: 'healthy',
    port: Number(PORT),
    uptime: process.uptime(),
    indexBuilt: hasIndex,
    timestamp: new Date().toISOString()
  });
});

// API endpoints
app.post('/api/reindex', async (req, res) => {
  try {
    await buildIndex();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/query', (req, res) => {
  try {
    const { q, k } = req.body || {};
    if (!q || typeof q !== 'string') return res.status(400).json({ ok: false, error: 'Missing q' });
    const { results, totalChunks } = queryIndex(q, Number(k) || 6);
    res.json({ ok: true, totalChunks, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Static web UI
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));
// Express v5 uses path-to-regexp@^6; use a regex catch-all instead of '*'
app.get(/.*/, (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`RAG server running on http://localhost:${PORT}`);
});
