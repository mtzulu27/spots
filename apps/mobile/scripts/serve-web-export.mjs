import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 4174);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

function resolvePath(urlPath) {
  const normalized = decodeURIComponent(urlPath.split('?')[0]);
  const requested = path.join(distDir, normalized);

  if (existsSync(requested) && statSync(requested).isFile()) {
    return requested;
  }

  const indexPath = path.join(distDir, 'index.html');
  return indexPath;
}

http
  .createServer((req, res) => {
    const filePath = resolvePath(req.url || '/');
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    createReadStream(filePath).pipe(res);
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`SPA export server running on http://127.0.0.1:${port}`);
  });
