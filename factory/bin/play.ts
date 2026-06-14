// Serve a generated bundle for eyeballing in a browser:
//   make play TRACE=<traceId>
//
// A tiny static file server over runs/<traceId>/game/ (the dir `make code` writes). Unseeded,
// real-browser execution — this is the human eyeball that the seeded gate cannot replace.
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const argOf = (flag: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : undefined;
};

const trace = argOf('TRACE') ?? process.argv[2];
if (!trace) {
  console.error('[play] usage: make play TRACE=<traceId>');
  process.exit(1);
}

const root = join('runs', trace, 'game');
if (!existsSync(join(root, 'index.html'))) {
  console.error(`[play] ${root}/index.html not found. Run \`make code\` first (it writes the bundle there).`);
  process.exit(1);
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const PORT = Number(process.env.PORT ?? 5174);

const server = createServer((req, res) => {
  const url = (req.url ?? '/').split('?')[0]!;
  const rel = normalize(url === '/' ? 'index.html' : url.replace(/^\/+/, ''));
  const path = join(root, rel);
  // Confine to the bundle dir — no path traversal out of runs/<trace>/game/.
  if (!path.startsWith(normalize(root)) || !existsSync(path)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
  res.end(readFileSync(path));
});

server.listen(PORT, () => {
  console.log(`[play] serving ${root}/  →  http://127.0.0.1:${PORT}/   (Ctrl-C to stop)`);
});
