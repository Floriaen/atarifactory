import fs from 'fs';

export function loadPack(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { items: {}, generatedAt: null };
    const txt = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(txt);
    if (!json || typeof json !== 'object' || !json.items) return { items: {}, generatedAt: null };
    return json;
  } catch {
    return { items: {}, generatedAt: null };
  }
}

export function savePack(filePath, pack) {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
  const payload = JSON.stringify({ items: pack.items || {}, generatedAt: new Date().toISOString() });
  fs.writeFileSync(filePath, payload, 'utf8');
}

