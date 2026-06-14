import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseGameBundle, type GameBundle, GAME_JS_FILE, SPRITE_DATA_FILE, ENTRY_FILE } from '../contracts/gameBundle.js';
import type { GameDefinition } from '../contracts/gameDefinition.js';
import type { SpritePack } from '../contracts/spritePack.js';

/** Static runtime files copied into every bundle verbatim (index.html is templated separately). */
const STATIC_FILES = ['controlBar.css', 'spriteRuntime.js', 'controlBar.js', 'background.js'] as const;

const templateUrl = (name: string): string => fileURLToPath(new URL(`./templates/${name}`, import.meta.url));

const cache = new Map<string, string>();
async function loadTemplate(name: string): Promise<string> {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const text = await readFile(templateUrl(name), 'utf8');
  cache.set(name, text);
  return text;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slug(title: string): string {
  const s = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'game';
}

/**
 * Build the inlined sprite-data script. Maps each SpritePack item id -> {gridSize, frames}
 * verbatim (ids are already canonical), so the bundle runs from `file://` with no fetch.
 */
function spriteDataScript(pack: SpritePack): string {
  const data: Record<string, { gridSize: number; frames: boolean[][][] }> = {};
  for (const [id, item] of Object.entries(pack.items)) {
    data[id] = { gridSize: item.gridSize, frames: item.frames };
  }
  return `window.spritePack = ${JSON.stringify(data)};\n`;
}

/**
 * The WRITE boundary (deterministic, no LLM): compose the bundle `files` from the static
 * runtime templates + the LLM-authored `game.js` + the inlined sprite data, inject the title,
 * then validate against the contract (fail loud). Single writer; `parseGameBundle` is the guard.
 */
export async function assembleGameBundle(game: GameDefinition, pack: SpritePack, js: string): Promise<GameBundle> {
  const indexTemplate = await loadTemplate('index.html');
  const indexHtml = indexTemplate.replace(/\{\{title\}\}/g, escapeHtml(game.title));

  const statics = await Promise.all(
    STATIC_FILES.map(async (name) => ({ path: name, contents: await loadTemplate(name) })),
  );

  const files = [
    { path: ENTRY_FILE, contents: indexHtml },
    ...statics,
    { path: SPRITE_DATA_FILE, contents: spriteDataScript(pack) },
    { path: GAME_JS_FILE, contents: js },
  ];

  return parseGameBundle({
    schemaVersion: 'gamebundle/v1',
    generatedAt: new Date().toISOString(),
    gameId: slug(game.title),
    entry: ENTRY_FILE,
    files,
  });
}
