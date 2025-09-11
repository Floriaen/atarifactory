import { describe, it, expect } from 'vitest';
import { loadPack, savePack } from '../../../utils/sprites/packStore.js';
import fs from 'fs';
import path from 'path';

describe('packStore save/load', () => {
  it('saves and loads a pack json', () => {
    const dir = path.join(process.cwd(), 'server', 'tests', 'tmp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'sprites.json');
    const pack = { items: { person: { gridSize: 12, frames: [Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=> x===6&&y===6))] } } };
    savePack(file, pack);
    const loaded = loadPack(file);
    expect(loaded.items).toBeDefined();
    expect(loaded.items.person).toBeDefined();
    // cleanup
    try { fs.unlinkSync(file); fs.rmdirSync(dir); } catch {}
  });
});

