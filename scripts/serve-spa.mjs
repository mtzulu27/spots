import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/mobile/dist');
const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const safePath = path.resolve(root, `.${requestPath}`);
  const file = safePath.startsWith(root) && fs.existsSync(safePath) && fs.statSync(safePath).isFile()
    ? safePath : path.join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
server.listen(8081, '0.0.0.0', () => console.log('Serving Spots SPA on http://0.0.0.0:8081'));
