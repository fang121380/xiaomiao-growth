const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = 5173;
const MIME = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.ico':'image/x-icon',
  '.webmanifest':'application/manifest+json',
};
http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  const f = path.join(__dirname, url);
  if (!f.startsWith(__dirname)) { res.statusCode = 403; return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    const ext = path.extname(f).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(data);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
