const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Auto import wireframe from Downloads if exists and not present
const defaultDownloadFile = 'C:\\Users\\PC\\Downloads\\TBChat-CloudDrive-Moderation-Wireframe (1).html';
try {
  if (fs.existsSync(defaultDownloadFile)) {
    const targetFile = path.join(UPLOADS_DIR, 'TBChat-CloudDrive-Moderation-Wireframe.html');
    if (!fs.existsSync(targetFile)) {
      fs.copyFileSync(defaultDownloadFile, targetFile);
      console.log('✅ Auto-imported wireframe to:', targetFile);
    }
  }
} catch (e) {
  console.warn('⚠️ Could not auto-import from Downloads:', e.message);
}

// Get all non-internal IPv4 addresses
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

function getPrimaryIp() {
  const ips = getNetworkIps();
  // Prefer 172.*, 192.168.*, 10.*
  const lanIp = ips.find(i => /^172\.|^192\.168\.|^10\./.test(i.address));
  if (lanIp) return lanIp.address;
  return ips[0]?.address || '127.0.0.1';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip'
};

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function sanitizeFilename(name) {
  // Strip path traversal and invalid characters
  let base = path.basename(name).replace(/[\\/:*?"<>|]/g, '_');
  if (!base || base.startsWith('.')) {
    base = `file_${Date.now()}.html`;
  }
  return base;
}

const server = http.createServer(async (req, res) => {
  // Add CORS headers for LAN convenience
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  // 1. API: Server Info & Network IP
  if (req.method === 'GET' && pathname === '/api/info') {
    const primaryIp = getPrimaryIp();
    const allIps = getNetworkIps();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      primaryIp,
      allIps,
      port: PORT,
      hostname: os.hostname(),
      uptime: process.uptime()
    }));
    return;
  }

  // 2. API: List Files
  if (req.method === 'GET' && pathname === '/api/files') {
    try {
      const files = await fs.promises.readdir(UPLOADS_DIR);
      const list = [];
      for (const file of files) {
        try {
          const filePath = path.join(UPLOADS_DIR, file);
          const stat = await fs.promises.stat(filePath);
          if (stat.isFile()) {
            list.push({
              name: file,
              size: stat.size,
              sizeFormatted: formatBytes(stat.size),
              mtime: stat.mtimeMs,
              createdAt: stat.birthtime,
              viewUrl: `/view/${encodeURIComponent(file)}`,
              downloadUrl: `/download/${encodeURIComponent(file)}`
            });
          }
        } catch (e) {
          // ignore individual stat errors
        }
      }
      // Sort newest first
      list.sort((a, b) => b.mtime - a.mtime);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(list));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 3. API: Upload File (Binary stream)
  if (req.method === 'POST' && pathname === '/api/upload') {
    let rawFilename = req.headers['x-file-name'] || reqUrl.searchParams.get('name') || `page_${Date.now()}.html`;
    try {
      rawFilename = decodeURIComponent(rawFilename);
    } catch (e) {}

    const filename = sanitizeFilename(rawFilename);
    const targetPath = path.join(UPLOADS_DIR, filename);

    const writeStream = fs.createWriteStream(targetPath);
    req.pipe(writeStream);

    writeStream.on('finish', async () => {
      try {
        const stat = await fs.promises.stat(targetPath);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          name: filename,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          viewUrl: `/view/${encodeURIComponent(filename)}`
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    writeStream.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Write failed: ' + err.message }));
    });
    return;
  }

  // 4. API: Delete File
  if (req.method === 'DELETE' && pathname.startsWith('/api/files/')) {
    const filename = sanitizeFilename(pathname.replace('/api/files/', ''));
    const targetPath = path.join(UPLOADS_DIR, filename);
    try {
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Deleted ${filename}` }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 5. VIEW FILE (Native render in browser)
  if (req.method === 'GET' && pathname.startsWith('/view/')) {
    const filename = sanitizeFilename(pathname.replace('/view/', ''));
    const targetPath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(targetPath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 - Không tìm thấy file</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;">
          <h2>⚠️ 404 - File không tồn tại hoặc đã bị xóa</h2>
          <p><a href="/" style="color:#0284c7;text-decoration:none;font-weight:bold;">← Quay lại Trang Quản Lý</a></p>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
      'X-Frame-Options': 'SAMEORIGIN'
    });
    fs.createReadStream(targetPath).pipe(res);
    return;
  }

  // 6. DOWNLOAD FILE
  if (req.method === 'GET' && pathname.startsWith('/download/')) {
    const filename = sanitizeFilename(pathname.replace('/download/', ''));
    const targetPath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(targetPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('File not found');
      return;
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
    });
    fs.createReadStream(targetPath).pipe(res);
    return;
  }

  // 7. DASHBOARD UI / PUBLIC STATIC FILES
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security check: ensure path remains within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain; charset=utf-8' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Fallback to Dashboard index.html
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getPrimaryIp();
  console.log(`=======================================================`);
  console.log(`🚀 HTML SHARE HUB IS RUNNING!`);
  console.log(`📡 Localhost:     http://localhost:${PORT}`);
  console.log(`🌐 LAN Network:   http://${ip}:${PORT}`);
  console.log(`📁 Files Storage: ${UPLOADS_DIR}`);
  console.log(`=======================================================`);
});
