const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// 1. Auto import wireframe from Downloads if exists
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
  console.warn('⚠️ Could not auto-import wireframe:', e.message);
}

// 2. Auto import paid-channel-phase1/dist folder if exists
const defaultDistFolder = 'C:\\paid-channel-phase1\\dist';
try {
  if (fs.existsSync(defaultDistFolder)) {
    const targetFolder = path.join(UPLOADS_DIR, 'paid-channel-phase1');
    if (!fs.existsSync(targetFolder)) {
      fs.cpSync(defaultDistFolder, targetFolder, { recursive: true });
      console.log('✅ Auto-imported dist project folder to:', targetFolder);
    }
  }
} catch (e) {
  console.warn('⚠️ Could not auto-import dist folder:', e.message);
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
  const lanIp = ips.find(i => /^172\.|^192\.168\.|^10\./.test(i.address));
  if (lanIp) return lanIp.address;
  return ips[0]?.address || '127.0.0.1';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
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
  '.zip': 'application/zip',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.map': 'application/json; charset=utf-8'
};

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Recursively get directory size and file count
function getDirectoryStats(dirPath) {
  let totalSize = 0;
  let fileCount = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = getDirectoryStats(fullPath);
        totalSize += sub.totalSize;
        fileCount += sub.fileCount;
      } else if (entry.isFile()) {
        try {
          const s = fs.statSync(fullPath);
          totalSize += s.size;
          fileCount++;
        } catch (e) {}
      }
    }
  } catch (e) {}
  return { totalSize, fileCount };
}

function render404(msg = 'Không tìm thấy trang hoặc file yêu cầu') {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>404 - Không tìm thấy</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 60px 20px; }
        h1 { font-size: 28px; margin-bottom: 12px; }
        p { color: #94a3b8; font-size: 15px; margin-bottom: 24px; }
        a { color: #6366f1; text-decoration: none; font-weight: 600; padding: 8px 16px; border-radius: 8px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); }
        a:hover { background: rgba(99,102,241,0.2); }
      </style>
    </head>
    <body>
      <h1>⚠️ 404 - Không Tìm Thấy</h1>
      <p>${msg}</p>
      <a href="/">← Quay lại Bảng Điều Khiển HTML Hub</a>
    </body>
    </html>
  `;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name, X-File-Path');

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

  // 2. API: List Files and Folders
  if (req.method === 'GET' && pathname === '/api/files') {
    try {
      const entries = await fs.promises.readdir(UPLOADS_DIR, { withFileTypes: true });
      const list = [];

      for (const entry of entries) {
        const fullPath = path.join(UPLOADS_DIR, entry.name);
        try {
          if (entry.isDirectory()) {
            const stats = getDirectoryStats(fullPath);
            const mtime = fs.statSync(fullPath).mtimeMs;
            const hasIndex = fs.existsSync(path.join(fullPath, 'index.html'));
            list.push({
              name: entry.name,
              type: 'project',
              hasIndexHtml: hasIndex,
              fileCount: stats.fileCount,
              size: stats.totalSize,
              sizeFormatted: formatBytes(stats.totalSize),
              mtime: mtime,
              viewUrl: `/view/${encodeURIComponent(entry.name)}/`,
              downloadUrl: `/download/${encodeURIComponent(entry.name)}`
            });
          } else if (entry.isFile()) {
            const stat = fs.statSync(fullPath);
            list.push({
              name: entry.name,
              type: 'file',
              size: stat.size,
              sizeFormatted: formatBytes(stat.size),
              mtime: stat.mtimeMs,
              viewUrl: `/view/${encodeURIComponent(entry.name)}`,
              downloadUrl: `/download/${encodeURIComponent(entry.name)}`
            });
          }
        } catch (e) {
          // ignore individual stat error
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

  // 3. API: Upload File or Folder items (Supports both single file & nested folder upload)
  if (req.method === 'POST' && pathname === '/api/upload') {
    // Check if relative path was supplied (e.g. from folder upload "dist/assets/styles.css")
    let rawPath = req.headers['x-file-path'] || req.headers['x-file-name'] || reqUrl.searchParams.get('path') || reqUrl.searchParams.get('name') || `file_${Date.now()}.html`;
    try {
      rawPath = decodeURIComponent(rawPath);
    } catch (e) {}

    // Normalize path to prevent directory traversal
    const safeRelPath = rawPath.replace(/\\/g, '/').split('/').filter(p => p && p !== '..').join('/');
    const targetPath = path.join(UPLOADS_DIR, safeRelPath);

    // Prevent escaping UPLOADS_DIR
    if (!targetPath.startsWith(UPLOADS_DIR)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid path' }));
      return;
    }

    // Ensure parent directory exists
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(targetPath);
    req.pipe(writeStream);

    writeStream.on('finish', async () => {
      try {
        const stat = await fs.promises.stat(targetPath);
        // Root project name (first folder name or filename)
        const parts = safeRelPath.split('/');
        const isFolderItem = parts.length > 1;
        const rootItemName = parts[0];

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          relPath: safeRelPath,
          rootName: rootItemName,
          isFolderItem: isFolderItem,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          viewUrl: isFolderItem ? `/view/${encodeURIComponent(rootItemName)}/` : `/view/${encodeURIComponent(rootItemName)}`
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

  // 4. API: Delete File or Project Folder
  if (req.method === 'DELETE' && pathname.startsWith('/api/files/')) {
    const rawName = pathname.replace('/api/files/', '');
    const safeName = path.basename(decodeURIComponent(rawName));
    const targetPath = path.join(UPLOADS_DIR, safeName);

    try {
      if (fs.existsSync(targetPath)) {
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(targetPath);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Deleted ${safeName}` }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Item not found' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 5. VIEW FILE OR PROJECT FOLDER (Native browser render with relative asset resolution)
  if (req.method === 'GET' && pathname.startsWith('/view/')) {
    const subpath = pathname.slice('/view/'.length);
    // Sanitize subpath: prevent ".." traversal
    const safeSubpath = subpath.replace(/\\/g, '/').split('/').filter(p => p !== '..').join('/');
    let targetPath = path.join(UPLOADS_DIR, safeSubpath);

    // Security check
    if (!targetPath.startsWith(UPLOADS_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(targetPath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(render404(`File hoặc thư mục <code>${subpath}</code> không tồn tại`));
      return;
    }

    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      // Must end with slash in URL for relative CSS/JS paths to resolve correctly
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { 'Location': pathname + '/' + (reqUrl.search || '') });
        res.end();
        return;
      }
      // Check for index.html inside the directory
      const indexPath = path.join(targetPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        targetPath = indexPath;
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(render404(`Thư mục <code>${safeSubpath}</code> không có file <code>index.html</code>`));
        return;
      }
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
      'X-Frame-Options': 'SAMEORIGIN'
    });
    fs.createReadStream(targetPath).pipe(res);
    return;
  }

  // 6. DOWNLOAD FILE (Single file download)
  if (req.method === 'GET' && pathname.startsWith('/download/')) {
    const filename = path.basename(decodeURIComponent(pathname.replace('/download/', '')));
    const targetPath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(targetPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('File not found');
      return;
    }

    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      // For folder download, redirect to view
      res.writeHead(302, { 'Location': `/view/${encodeURIComponent(filename)}/` });
      res.end();
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

function startServer(port = PORT) {
  return new Promise((resolve) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${port} is already in use by another instance.`);
        resolve({ inUse: true, port });
        return;
      }
      console.error('Server error:', err);
      resolve({ error: err, port });
    });

    server.listen(port, '0.0.0.0', () => {
      const ip = getPrimaryIp();
      console.log(`=======================================================`);
      console.log(`🚀 HTML & WEB APP SHARE HUB IS RUNNING!`);
      console.log(`📡 Localhost:     http://localhost:${port}`);
      console.log(`🌐 LAN Network:   http://${ip}:${port}`);
      console.log(`📁 Files Storage: ${UPLOADS_DIR}`);
      console.log(`=======================================================`);
      resolve({ inUse: false, port });
    });
  });
}

// Auto-start only when run directly: `node server.js`
if (require.main === module) {
  startServer();
}

module.exports = {
  server,
  startServer,
  PORT,
  getPrimaryIp,
  getNetworkIps,
  UPLOADS_DIR
};


