import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEX_PATH = path.resolve(__dirname, '..', 'knowledge', 'index.json');

function loadIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`Index not found. Build it first: ${INDEX_PATH}`);
  }
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
}

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','else','for','while','of','to','in','on','at','by','with','as','is','it','be','are','was','were','this','that','these','those','from','not','we','you','i','our','your','their','they','he','she'
]);
function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter(t => t && !STOPWORDS.has(t) && t.length > 1);
}

function bm25Score(queryTokens, index, chunkIdx, k1 = 1.5, b = 0.75) {
  const N = index.totalChunks;
  const avgdl = index.avgdl || 1;
  const tfObj = index.chunkTf[chunkIdx];
  const dl = index.chunkLen[chunkIdx] || 1;
  let score = 0;
  const used = new Set();
  for (const q of queryTokens) {
    if (used.has(q)) continue;
    used.add(q);
    const df = index.df[q] || 0;
    if (df === 0) continue;
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    const f = tfObj[q] || 0;
    const denom = f + k1 * (1 - b + b * (dl / avgdl));
    score += idf * ((f * (k1 + 1)) / (denom || 1));
  }
  return score;
}

function queryIndex(q, k = 5) {
  const index = loadIndex();
  const qTokens = tokenize(q);
  const scores = [];
  for (let i = 0; i < index.totalChunks; i++) {
    const s = bm25Score(qTokens, index, i);
    if (s > 0) scores.push({ i, s });
  }
  scores.sort((a, b) => b.s - a.s);
  const top = scores.slice(0, k).map(({ i, s }) => ({
    score: s,
    file: index.chunks[i].file,
    startLine: index.chunks[i].startLine,
    text: index.chunks[i].text,
  }));
  return { results: top, totalChunks: index.totalChunks };
}

async function main() {
  const q = process.argv.slice(2).join(' ').trim();
  if (!q) {
    // eslint-disable-next-line no-console
    console.error('Usage: npm -w rag run query -- <query>');
    process.exit(1);
  }
  const { results, totalChunks } = queryIndex(q, 8);
  // eslint-disable-next-line no-console
  console.log(`Query: ${q}`);
  // eslint-disable-next-line no-console
  console.log(`Searched ${totalChunks} chunks. Top results:`);
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`- ${r.file}:${r.startLine} (score ${r.score.toFixed(3)})`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    // eslint-disable-next-line no-console
    console.error('Search failed:', err);
    process.exit(1);
  });
}

export { queryIndex };

