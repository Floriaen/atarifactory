// Inspect a stored run trace:  make view TRACE=<traceId>
import { readFile } from 'node:fs/promises';

const traceId = process.argv[2];
if (!traceId) {
  console.error('usage: make view TRACE=<traceId>');
  process.exit(1);
}

try {
  const trace = await readFile(`runs/${traceId}/trace.json`, 'utf8');
  console.log(trace);
} catch {
  console.error(`no trace found at runs/${traceId}/trace.json`);
  process.exit(1);
}
