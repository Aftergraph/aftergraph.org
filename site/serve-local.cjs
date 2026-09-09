// Minimal static server for Atlas browser smoke tests (CI + local).
// Usage: node site/serve-local.cjs [port, default 8471] [siteDir, default site/].
// Serves the built static tree only: /atlas -> site/atlas/index.html,
// /atlas/* files, snapshots, projection.json. No worker logic, no writes.
const http = require('http');
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(process.argv[3] || path.join(__dirname));
const PORT = Number(process.argv[2] || 8471);

const CT = {
  '.html': 'text/html;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8',
  '.css': 'text/css;charset=utf-8',
  '.json': 'application/json;charset=utf-8',
  '.svg': 'image/svg+xml;charset=utf-8',
  '.txt': 'text/plain;charset=utf-8',
  '.ico': 'image/svg+xml;charset=utf-8',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/atlas' || rel === '/atlas/') rel = '/atlas/index.html';
  // Never escape the site dir.
  const file = path.normalize(path.join(SITE, rel));
  if (!file.startsWith(SITE + path.sep) && file !== SITE) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': CT[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  console.log(`serve-local: ${SITE} on http://localhost:${PORT}/atlas/`);
});
