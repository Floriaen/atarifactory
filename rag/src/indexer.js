import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'knowledge');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'index.json');

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','else','for','while','of','to','in','on','at','by','with','as','is','it','be','are','was','were','this','that','these','those','from','not','we','you','i','our','your','their','they','he','she'
]);

function isTextFile(file) {
  return /(\.md|\.js|\.mjs|\.cjs|\.ts|\.tsx|\.json|\.html|\.css)$/i.test(file);
}

function shouldInclude(file) {
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('node_modules')) return false;
  if (rel.includes('/.git/')) return false;
  if (rel.startsWith('frontend/node_modules')) return false;
  if (rel.startsWith('rag/')) return false; // avoid self-indexing
  return (
    rel.startsWith('docs/') ||
    rel.startsWith('server/') ||
    rel.startsWith('frontend/') ||
    rel === 'README.md' ||
    rel === 'CLAUDE.md'
  );
}

function readAllFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...readAllFiles(full));
    } else if (entry.isFile() && isTextFile(full) && shouldInclude(full)) {
      out.push(full);
    }
  }
  return out;
}

function splitLines(text) {
  return text.split(/\r?\n/);
}

function chunkFile(filePath, text) {
  const rel = path.relative(ROOT, filePath);
  const isMarkdown = /\.md$/i.test(filePath);
  const chunks = [];
  const lines = splitLines(text);
  if (isMarkdown) {
    let buf = [];
    let bufLen = 0;
    let startLine = 1;
    const flush = () => {
      if (!buf.length) return;
      const content = buf.join('\n').trim();
      if (content) chunks.push({ file: rel, startLine, text: content });
      startLine += Math.max(1, buf.length - 3);
      buf = [];
      bufLen = 0;
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      buf.push(line);
      bufLen += line.length + 1;
      const isHeading = /^\s*#/.test(line);
      if (bufLen >= 1200 || (isHeading && bufLen > 300)) flush();
    }
    flush();
  } else {
    const CHUNK = 80;
    const OVERLAP = 10;
    for (let i = 0; i < lines.length; i += (CHUNK - OVERLAP)) {
      const part = lines.slice(i, Math.min(i + CHUNK, lines.length));
      const content = part.join('\n').trim();
      if (content) chunks.push({ file: rel, startLine: i + 1, text: content });
    }
  }
  return chunks;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/`[^`]*`/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/[^a-z0-9_]+/)
    .filter(t => t && !STOPWORDS.has(t) && t.length > 1);
}

function buildIndex(chunks) {
  const df = new Map();
  const chunkTf = [];
  const chunkLen = [];
  for (let idx = 0; idx < chunks.length; idx++) {
    const tokens = tokenize(chunks[idx].text);
    const tf = new Map();
    for (const tok of tokens) tf.set(tok, (tf.get(tok) || 0) + 1);
    chunkTf.push(Object.fromEntries(tf));
    chunkLen.push(tokens.length || 1);
    const unique = new Set(tokens);
    unique.forEach(t => df.set(t, (df.get(t) || 0) + 1));
  }
  const avgdl = chunkLen.reduce((a, b) => a + b, 0) / chunkLen.length || 1;
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    totalChunks: chunks.length,
    avgdl,
    df: Object.fromEntries(df),
    chunkTf,
    chunkLen,
    chunks,
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const files = readAllFiles(ROOT);
  const chunks = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    chunks.push(...chunkFile(file, text));
  }
  const index = buildIndex(chunks);
  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), 'utf8');
   
  console.log(`RAG index built: ${index.totalChunks} chunks -> ${OUTPUT_FILE}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
     
    console.error('Indexing failed:', err);
    process.exit(1);
  });
}

export default main;

