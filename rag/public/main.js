const qEl = document.getElementById('q');
const searchBtn = document.getElementById('search');
const reindexBtn = document.getElementById('reindex');
const resultsEl = document.getElementById('results');
const statusEl = document.getElementById('status');

function setStatus(msg, type = '') {
  statusEl.textContent = msg || '';
  statusEl.className = 'status' + (type ? ' ' + type : '');
}

function renderResults(items) {
  resultsEl.innerHTML = '';
  if (!items || items.length === 0) {
    resultsEl.innerHTML = '<div class="empty">No results</div>';
    return;
  }
  for (const r of items) {
    const wrap = document.createElement('div');
    wrap.className = 'item';
    const head = document.createElement('div');
    head.className = 'head';
    const score = r.score != null ? ` (score ${Number(r.score).toFixed(2)})` : '';
    head.textContent = `${r.file}:${r.startLine}${score}`;
    const pre = document.createElement('pre');
    pre.className = 'snippet';
    pre.textContent = r.text;
    wrap.appendChild(head);
    wrap.appendChild(pre);
    resultsEl.appendChild(wrap);
  }
}

async function search() {
  const q = qEl.value.trim();
  if (!q) {
    renderResults([]);
    return;
  }
  setStatus('Searching...');
  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, k: 8 })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
    renderResults(data.results);
    setStatus(`Found ${data.results.length} of ${data.totalChunks} chunks`);
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
  }
}

async function reindex() {
  setStatus('Reindexing...');
  try {
    const res = await fetch('/api/reindex', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
    setStatus('Index rebuilt');
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
  }
}

searchBtn.addEventListener('click', search);
qEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
reindexBtn.addEventListener('click', reindex);

