#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Store mode at repo root so it's visible project-wide
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MODE_FILE = path.join(REPO_ROOT, '.assistant-mode');

const arg = (process.argv[2] || '').toLowerCase();

function printStatus() {
  let mode = 'ask-first';
  try { mode = fs.readFileSync(MODE_FILE, 'utf8').trim(); } catch {}
   
  console.log(JSON.stringify({ mode, file: MODE_FILE }));
}

if (arg === 'status' || !arg) {
  printStatus();
  process.exit(0);
}

if (!['auto', 'ask-first'].includes(arg)) {
   
  console.error('Usage: node scripts/setMode.js <auto|ask-first|status>');
  process.exit(1);
}

fs.writeFileSync(MODE_FILE, arg + '\n', 'utf8');
printStatus();
