import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, './dist');

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',   // ⭐ 模块脚本需要这个
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  let decoded = decodeURIComponent(req.url);

  if (decoded.includes('\0')) {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  let target = path.resolve(path.join(ROOT, decoded));

  if (!target.startsWith(ROOT + path.sep) && target !== ROOT) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // 目录默认 index.html
  if (target.endsWith(path.sep) || (fs.existsSync(target) && fs.statSync(target).isDirectory())) {
    target = path.join(target, 'index.html');
  }

  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      // ⭐ 根据文件扩展名设置 Content-Type
      const ext = path.extname(target).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`AppManager server running on port ${PORT}`)
})
