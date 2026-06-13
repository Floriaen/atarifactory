const rows = document.getElementById('rows');
const summary = document.getElementById('summary');
const filterChain = document.getElementById('filter-chain');
const filterTrace = document.getElementById('filter-trace');
const filterText = document.getElementById('filter-text');
const limitSel = document.getElementById('limit');
const autoRefresh = document.getElementById('auto-refresh');
const refreshBtn = document.getElementById('refresh');

const modal = document.getElementById('modal');
const metaBox = document.getElementById('meta');
const promptBox = document.getElementById('prompt');
const outputBox = document.getElementById('output');
const closeBtn = document.getElementById('close');

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString();
}

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function load() {
  const params = new URLSearchParams();
  if (filterChain.value) params.set('chain', filterChain.value);
  if (filterTrace.value) params.set('traceId', filterTrace.value);
  params.set('limit', limitSel.value);
  const { traces } = await fetchJSON(`/debug/llm/traces?${params.toString()}`).then(x => x);
  const text = filterText.value.toLowerCase();
  const filtered = text
    ? traces.filter(t => JSON.stringify(t).toLowerCase().includes(text))
    : traces;

  // summary
  const byChain = filtered.reduce((m, t) => ((m[t.chain] = (m[t.chain] || 0) + 1), m), {});
  summary.textContent = `Total: ${filtered.length} | ` + Object.entries(byChain).map(([k,v]) => `${k}:${v}`).join(', ');

  rows.innerHTML = '';
  for (const t of filtered.slice().reverse()) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtTime(t.timestamp)}</td>
      <td>${t.chain}</td>
      <td>${t.durationMs ?? ''}</td>
      <td>${t.tokenDelta ?? ''}</td>
      <td class="mono">${t.traceId || ''}</td>
      <td><button data-id="${t.id}">View</button></td>
    `;
    tr.querySelector('button').addEventListener('click', async () => {
      const { trace } = await fetchJSON(`/debug/llm/trace/${t.id}?full=1`);
      // Meta
      const meta = {
        id: trace.id,
        timestamp: trace.timestamp,
        chain: trace.chain,
        phase: trace.phase,
        model: trace.model,
        durationMs: trace.durationMs,
        tokenDelta: trace.tokenDelta,
        traceId: trace.traceId,
        inputVars: trace.inputVars,
      };
      metaBox.textContent = JSON.stringify(meta, null, 2);
      // Helpers: expandable content with "Show more..." toggle
      function setupExpandable(preEl, fullText, limit = 500) {
        // Clean previous state
        preEl.textContent = '';
        // Remove any existing toggle immediately after this pre
        if (preEl.nextElementSibling && preEl.nextElementSibling.classList && preEl.nextElementSibling.classList.contains('more-toggle')) {
          preEl.nextElementSibling.remove();
        }

        const text = fullText || '';
        const truncated = text.length > limit ? text.slice(0, limit) + '\n…' : text;
        let expanded = false;

        // Initial content
        preEl.textContent = truncated;

        if (text.length > limit) {
          const btn = document.createElement('button');
          btn.className = 'more-toggle';
          btn.textContent = 'Show more…';
          btn.style.margin = '6px 0 10px 0';
          btn.addEventListener('click', () => {
            expanded = !expanded;
            if (expanded) {
              preEl.textContent = text;
              btn.textContent = 'Show less';
            } else {
              preEl.textContent = truncated;
              btn.textContent = 'Show more…';
            }
          });
          preEl.insertAdjacentElement('afterend', btn);
        }
      }

      // Prompt (expandable)
      setupExpandable(promptBox, trace.hydratedPrompt || '', 500);

      // Output (pretty if JSON, expandable)
      let out = trace.output;
      if (typeof out === 'string') {
        try { out = JSON.stringify(JSON.parse(out), null, 2); } catch {}
      } else if (out && typeof out === 'object') {
        out = JSON.stringify(out, null, 2);
      }
      setupExpandable(outputBox, out || '', 500);
      modal.classList.remove('hidden');
    });
    rows.appendChild(tr);
  }
}

refreshBtn.addEventListener('click', load);
closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

function loop() {
  if (autoRefresh.checked) load().catch(console.error);
  setTimeout(loop, 2000);
}
loop();
