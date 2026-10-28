const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;

// Resolve writable uploads directory (handle packaged Electron app.asar)
let electronApp = null;
try {
  electronApp = require('electron').app;
} catch (e) {}

const isPackaged = electronApp && electronApp.isPackaged;
const UPLOADS_DIR = isPackaged
  ? path.join(electronApp.getPath('userData'), 'uploads')
  : (process.env.UPLOADS_DIR || path.join(__dirname, 'uploads'));

const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR) && !isPackaged) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// In packaged app, seed initial files from bundled uploads to writable UPLOADS_DIR
if (isPackaged) {
  const bundledUploads = path.join(__dirname, 'uploads');
  try {
    if (fs.existsSync(bundledUploads)) {
      const items = fs.readdirSync(bundledUploads);
      for (const item of items) {
        const dest = path.join(UPLOADS_DIR, item);
        if (!fs.existsSync(dest)) {
          fs.cpSync(path.join(bundledUploads, item), dest, { recursive: true });
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ Seeding bundled uploads failed:', e.message);
  }
}

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

  // 0. API: Download Desktop App (.exe) for other LAN users
  if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/api/download-app' || pathname === '/download-app')) {
    const candidatePaths = [
      path.join(__dirname, 'dist-electron', 'HTML-Share-Hub-Setup.exe'),
      'C:\\Task4-paid-channel\\html-hub\\dist-electron\\HTML-Share-Hub-Setup.exe',
      'C:\\Users\\PC\\Downloads\\HTML-Share-Hub-Setup.exe',
      process.resourcesPath ? path.join(process.resourcesPath, 'HTML-Share-Hub-Setup.exe') : null,
      electronApp ? path.join(electronApp.getPath('userData'), 'HTML-Share-Hub-Setup.exe') : null
    ].filter(Boolean);

    let targetExe = null;
    for (const cand of candidatePaths) {
      if (fs.existsSync(cand)) {
        try {
          const s = fs.statSync(cand);
          if (s.isFile() && s.size > 5 * 1024 * 1024) { // Valid installer must be > 5MB
            targetExe = cand;
            break;
          }
        } catch (e) {}
      }
    }

    if (!targetExe) {
      // Try scanning dist-electron folder if exists
      const distElectronDir = path.join(__dirname, 'dist-electron');
      if (fs.existsSync(distElectronDir)) {
        try {
          const files = fs.readdirSync(distElectronDir);
          const found = files.find(f => f.endsWith('.exe') && !f.includes('elevate'));
          if (found) {
            const p = path.join(distElectronDir, found);
            if (fs.statSync(p).size > 5 * 1024 * 1024) targetExe = p;
          }
        } catch (e) {}
      }
    }

    if (targetExe && fs.existsSync(targetExe)) {
      const stat = fs.statSync(targetExe);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.microsoft.portable-executable',
        'Content-Disposition': 'attachment; filename="HTML-Share-Hub-Setup.exe"',
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache'
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(targetExe).pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(render404('Bản cài đặt Desktop .exe đang được đóng gói, vui lòng thử lại sau ít phút!'));
      return;
    }
  }

const ALIASES_FILE = path.join(UPLOADS_DIR, '.aliases.json');
const HISTORY_DIR = path.join(UPLOADS_DIR, '.history');
if (!fs.existsSync(HISTORY_DIR)) {
  try { fs.mkdirSync(HISTORY_DIR, { recursive: true }); } catch (e) {}
}

function getAliases() {
  try {
    if (fs.existsSync(ALIASES_FILE)) {
      return JSON.parse(fs.readFileSync(ALIASES_FILE, 'utf8') || '{}');
    }
  } catch (e) {}
  return {};
}

function saveAlias(oldName, newName) {
  try {
    const aliases = getAliases();
    aliases[oldName] = newName;
    fs.writeFileSync(ALIASES_FILE, JSON.stringify(aliases, null, 2), 'utf8');
  } catch (e) {}
}

function getItemHistoryDir(itemName) {
  return path.join(HISTORY_DIR, itemName);
}

function getItemHistoryMetaPath(itemName) {
  return path.join(getItemHistoryDir(itemName), 'versions.json');
}

function getItemHistory(itemName) {
  const metaPath = getItemHistoryMetaPath(itemName);
  try {
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf8') || '{"versions":[]}');
    }
  } catch (e) {}
  return { file: itemName, versions: [] };
}

function saveItemHistory(itemName, historyData) {
  const dir = getItemHistoryDir(itemName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getItemHistoryMetaPath(itemName), JSON.stringify(historyData, null, 2), 'utf8');
}

// Archive current version of a file before overwriting it
function archiveVersion(itemName, note = 'Cập nhật ghi đè', originalUploadName = null) {
  try {
    const activeFilePath = path.join(UPLOADS_DIR, itemName);
    if (!fs.existsSync(activeFilePath)) return null;

    const stat = fs.statSync(activeFilePath);
    if (!stat.isFile()) return null; // Only archive individual files

    const history = getItemHistory(itemName);
    const versionNumber = history.versions.length + 1;
    const ext = path.extname(itemName) || '.html';
    const backupFileName = `v${versionNumber}_${Date.now()}${ext}`;
    const itemDir = getItemHistoryDir(itemName);
    if (!fs.existsSync(itemDir)) fs.mkdirSync(itemDir, { recursive: true });

    const backupFilePath = path.join(itemDir, backupFileName);
    fs.copyFileSync(activeFilePath, backupFilePath);

    const versionEntry = {
      version: versionNumber,
      backupFile: backupFileName,
      timestamp: stat.mtimeMs,
      formattedTime: new Date(stat.mtimeMs).toLocaleString('vi-VN', { hour12: false }),
      size: stat.size,
      sizeFormatted: formatBytes(stat.size),
      note: note,
      originalUploadName: originalUploadName || itemName
    };

    history.versions.push(versionEntry);
    saveItemHistory(itemName, history);
    console.log(`📦 Archived version v${versionNumber} for "${itemName}" -> ${backupFileName}`);
    return versionEntry;
  } catch (e) {
    console.warn(`⚠️ Failed to archive version for ${itemName}:`, e.message);
    return null;
  }
}

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
        if (entry.name.startsWith('.')) continue; // ignore hidden files/metadata
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
            const hist = getItemHistory(entry.name);
            const versionCount = (hist.versions?.length || 0) + 1;
            list.push({
              name: entry.name,
              type: 'file',
              size: stat.size,
              sizeFormatted: formatBytes(stat.size),
              mtime: stat.mtimeMs,
              versionCount: versionCount,
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

  // 3. API: Upload File or Folder items (Supports target overwrite to keep identical link)
  if (req.method === 'POST' && pathname === '/api/upload') {
    // Check if target file was specified to overwrite (keeps existing URL!)
    let targetOverride = reqUrl.searchParams.get('target') || req.headers['x-target-name'];
    if (targetOverride) {
      try { targetOverride = decodeURIComponent(targetOverride); } catch (e) {}
    }

    // Check if relative path was supplied (e.g. from folder upload "dist/assets/styles.css")
    let rawPath = req.headers['x-file-path'] || req.headers['x-file-name'] || reqUrl.searchParams.get('path') || reqUrl.searchParams.get('name') || `file_${Date.now()}.html`;
    try {
      rawPath = decodeURIComponent(rawPath);
    } catch (e) {}

    // Normalize path to prevent directory traversal
    let safeRelPath = rawPath.replace(/\\/g, '/').split('/').filter(p => p && p !== '..').join('/');

    let isExplicitUpdate = false;
    let autoNormalizedFrom = null;

    if (targetOverride) {
      const safeTarget = path.basename(targetOverride);
      safeRelPath = safeTarget;
      isExplicitUpdate = true;
    } else {
      // Auto-detect browser duplicate download pattern: "name (1).html", "name (2).html", "name - Copy.html"
      const match = safeRelPath.match(/^(.*?)(\s*\(\d+\)|\s*-\s*copy)(\.html?)$/i);
      if (match) {
        const candidateBase = match[1].trim() + match[3];
        const candidatePath = path.join(UPLOADS_DIR, candidateBase);
        if (fs.existsSync(candidatePath)) {
          autoNormalizedFrom = safeRelPath;
          safeRelPath = candidateBase;
          isExplicitUpdate = true;
          console.log(`🔄 Auto-updating existing base file "${candidateBase}" from "${autoNormalizedFrom}" (URL preserved)`);
        }
      } else {
        const existingPath = path.join(UPLOADS_DIR, safeRelPath);
        if (fs.existsSync(existingPath)) {
          isExplicitUpdate = true;
        }
      }
    }

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

    // Archive previous version if overwriting an existing file
    let archivedVersion = null;
    if (isExplicitUpdate && fs.existsSync(targetPath)) {
      try {
        const statOld = fs.statSync(targetPath);
        if (statOld.isFile()) {
          const archiveNote = autoNormalizedFrom
            ? `Tự động gộp từ "${autoNormalizedFrom}"`
            : (targetOverride ? `Cập nhật đè từ file "${rawPath}"` : 'Cập nhật ghi đè');
          archivedVersion = archiveVersion(safeRelPath, archiveNote, autoNormalizedFrom || rawPath);
        }
      } catch (e) {
        console.warn('⚠️ Could not archive old version:', e.message);
      }
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
        const hist = getItemHistory(rootItemName);
        const versionCount = (hist.versions?.length || 0) + 1;

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          relPath: safeRelPath,
          rootName: rootItemName,
          isFolderItem: isFolderItem,
          isUpdated: isExplicitUpdate,
          archivedVersion: archivedVersion ? archivedVersion.version : null,
          versionCount: versionCount,
          autoNormalizedFrom: autoNormalizedFrom,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          viewUrl: isFolderItem ? `/view/${encodeURIComponent(rootItemName)}/` : `/view/${encodeURIComponent(rootItemName)}`,
          message: isExplicitUpdate
            ? (archivedVersion ? `Đã cập nhật nội dung cho "${rootItemName}". Bản cũ đã lưu vào Lịch sử (v${archivedVersion.version})!` : `Đã cập nhật nội dung cho "${rootItemName}" (Link LAN giữ nguyên 100%)`)
            : `Đã tải lên "${rootItemName}"`
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

  // 4a. API: Rename File or Project (Custom URL / Permanent Slug)
  if (req.method === 'POST' && pathname === '/api/rename') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { oldName, newName } = JSON.parse(body || '{}');
        if (!oldName || !newName) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'oldName và newName là bắt buộc' }));
          return;
        }

        const safeOld = path.basename(oldName);
        let safeNew = path.basename(newName).trim();

        if (safeOld.toLowerCase().endsWith('.html') && !safeNew.toLowerCase().endsWith('.html') && !safeNew.toLowerCase().endsWith('.htm')) {
          safeNew += '.html';
        }

        const oldPath = path.join(UPLOADS_DIR, safeOld);
        const newPath = path.join(UPLOADS_DIR, safeNew);

        if (!fs.existsSync(oldPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Mục cần đổi tên không tồn tại' }));
          return;
        }

        if (fs.existsSync(newPath) && safeOld !== safeNew) {
          res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: `Tên hoặc link "${safeNew}" đã tồn tại. Vui lòng chọn tên khác!` }));
          return;
        }

        if (safeOld !== safeNew) {
          await fs.promises.rename(oldPath, newPath);
          saveAlias(safeOld, safeNew);

          // Also rename history folder if exists
          try {
            const oldHistDir = getItemHistoryDir(safeOld);
            const newHistDir = getItemHistoryDir(safeNew);
            if (fs.existsSync(oldHistDir)) {
              if (!fs.existsSync(path.dirname(newHistDir))) fs.mkdirSync(path.dirname(newHistDir), { recursive: true });
              await fs.promises.rename(oldHistDir, newHistDir);
              const hist = getItemHistory(safeNew);
              hist.file = safeNew;
              saveItemHistory(safeNew, hist);
            }
          } catch (e) {
            console.warn('⚠️ Could not rename history folder:', e.message);
          }
        }

        const isDir = fs.statSync(newPath).isDirectory();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          oldName: safeOld,
          newName: safeNew,
          viewUrl: isDir ? `/view/${encodeURIComponent(safeNew)}/` : `/view/${encodeURIComponent(safeNew)}`,
          message: `Đã đổi tên thành "${safeNew}". Link cũ vẫn tự động chuyển tiếp!`
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4b. API: Delete File or Project Folder
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

        // Clean up history folder as well
        try {
          const histDir = getItemHistoryDir(safeName);
          if (fs.existsSync(histDir)) {
            fs.rmSync(histDir, { recursive: true, force: true });
          }
        } catch (e) {}

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

  // 4c. API: Get File Version History
  if (req.method === 'GET' && (pathname === '/api/history' || pathname === '/history')) {
    const itemName = reqUrl.searchParams.get('file');
    if (!itemName) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Tham số file là bắt buộc' }));
      return;
    }
    const safeName = path.basename(itemName);
    const activeFilePath = path.join(UPLOADS_DIR, safeName);
    if (!fs.existsSync(activeFilePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: `Không tìm thấy file "${safeName}"` }));
      return;
    }

    try {
      const stat = fs.statSync(activeFilePath);
      const history = getItemHistory(safeName);
      const totalVersions = (history.versions?.length || 0) + 1;
      const currentVersion = {
        version: totalVersions,
        isCurrent: true,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        timestamp: stat.mtimeMs,
        formattedTime: new Date(stat.mtimeMs).toLocaleString('vi-VN', { hour12: false }),
        viewUrl: `/view/${encodeURIComponent(safeName)}`,
        downloadUrl: `/download/${encodeURIComponent(safeName)}`,
        note: (history.versions?.length || 0) > 0 ? 'Bản mới nhất (Đang phát hành)' : 'Bản khởi tạo ban đầu'
      };

      const historicalList = (history.versions || []).map(v => ({
        version: v.version,
        isCurrent: false,
        size: v.size,
        sizeFormatted: v.sizeFormatted,
        timestamp: v.timestamp,
        formattedTime: v.formattedTime,
        note: v.note,
        originalUploadName: v.originalUploadName,
        viewUrl: `/view-history?file=${encodeURIComponent(safeName)}&v=${v.version}`,
        downloadUrl: `/download-history?file=${encodeURIComponent(safeName)}&v=${v.version}`
      })).reverse();

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        file: safeName,
        totalVersions,
        current: currentVersion,
        history: historicalList
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 4d. API: Restore Older Version
  if (req.method === 'POST' && pathname === '/api/restore-history') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { file, version } = JSON.parse(body || '{}');
        if (!file || !version) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'file và version là bắt buộc' }));
          return;
        }
        const safeName = path.basename(decodeURIComponent(file));
        const v = parseInt(version, 10);
        const history = getItemHistory(safeName);
        const entry = (history.versions || []).find(item => item.version === v);
        if (!entry) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: `Không tìm thấy phiên bản v${v}` }));
          return;
        }
        const backupFilePath = path.join(getItemHistoryDir(safeName), entry.backupFile);
        if (!fs.existsSync(backupFilePath)) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: `File lưu trữ của v${v} không tồn tại trên ổ đĩa` }));
          return;
        }

        // Archive current active version before rolling back
        archiveVersion(safeName, `Lưu trữ trước khi khôi phục về v${v}`);

        // Overwrite active file with backup file
        const activeFilePath = path.join(UPLOADS_DIR, safeName);
        fs.copyFileSync(backupFilePath, activeFilePath);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: `Đã khôi phục thành công về phiên bản v${v}! Link LAN giữ nguyên 100%.`,
          viewUrl: `/view/${encodeURIComponent(safeName)}`
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4e. VIEW HISTORICAL VERSION
  if (req.method === 'GET' && pathname === '/view-history') {
    const fileName = reqUrl.searchParams.get('file');
    const v = parseInt(reqUrl.searchParams.get('v'), 10);
    if (!fileName || isNaN(v)) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(render404('Thiếu tham số file hoặc version'));
      return;
    }
    const safeName = path.basename(fileName);
    const history = getItemHistory(safeName);
    const entry = (history.versions || []).find(item => item.version === v);
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(render404(`Không tìm thấy phiên bản v${v} của file "${safeName}"`));
      return;
    }
    const backupFilePath = path.join(getItemHistoryDir(safeName), entry.backupFile);
    if (!fs.existsSync(backupFilePath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(render404(`File lưu trữ phiên bản v${v} không tồn tại trên ổ đĩa`));
      return;
    }

    try {
      let content = fs.readFileSync(backupFilePath, 'utf8');
      const ext = path.extname(safeName).toLowerCase();
      if (ext === '.html' || ext === '.htm') {
        const bannerHtml = `
          <!-- Floating Historical Version Bar -->
          <div id="__history_bar__" style="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:rgba(15,23,42,0.96);backdrop-filter:blur(10px);border-bottom:1px solid rgba(99,102,241,0.3);color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:10px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.5);">
            <div style="display:flex;align-items:center;gap:10px;overflow:hidden;">
              <span style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.3);padding:3px 9px;border-radius:999px;font-weight:700;font-size:11px;letter-spacing:0.5px;flex-shrink:0;">🕒 BẢN CŨ v${v}</span>
              <span style="color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                Đang xem bản lưu lúc <b>${entry.formattedTime}</b> (${entry.sizeFormatted}) &bull; <span style="color:#94a3b8;">${entry.note || ''}</span>
              </span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
              <a href="/view/${encodeURIComponent(safeName)}" style="color:#818cf8;text-decoration:none;font-weight:600;padding:5px 12px;border-radius:8px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);">Xem bản hiện tại →</a>
              <button onclick="__restoreHistoryVersion()" style="background:#4f46e5;color:#fff;border:none;padding:5px 14px;border-radius:8px;font-weight:600;font-size:12px;cursor:pointer;box-shadow:0 2px 8px rgba(79,70,229,0.3);">⏪ Khôi phục bản này</button>
            </div>
          </div>
          <div style="height:48px;"></div>
          <script>
            async function __restoreHistoryVersion() {
              if (!confirm('Bạn có chắc muốn khôi phục bản v${v} này thành phiên bản phát hành chính thức không? Link LAN vẫn giữ nguyên!')) return;
              try {
                const res = await fetch('/api/restore-history', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ file: '${encodeURIComponent(safeName)}', version: ${v} })
                });
                const data = await res.json();
                if (data.success) {
                  alert('Khôi phục thành công! Đang chuyển về bản chính thức...');
                  window.location.href = '/view/${encodeURIComponent(safeName)}';
                } else {
                  alert('Khôi phục thất bại: ' + (data.error || 'Lỗi không xác định'));
                }
              } catch (e) {
                alert('Lỗi: ' + e.message);
              }
            }
          </script>
        `;
        if (content.includes('<body')) {
          content = content.replace(/<body[^>]*>/i, match => `${match}\n${bannerHtml}`);
        } else {
          content = bannerHtml + content;
        }
      }

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
      return;
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(render404('Lỗi khi đọc file lịch sử: ' + e.message));
      return;
    }
  }

  // 4f. DOWNLOAD HISTORICAL VERSION
  if (req.method === 'GET' && pathname === '/download-history') {
    const fileName = reqUrl.searchParams.get('file');
    const v = parseInt(reqUrl.searchParams.get('v'), 10);
    if (!fileName || isNaN(v)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Thiếu tham số file hoặc v' }));
      return;
    }
    const safeName = path.basename(fileName);
    const history = getItemHistory(safeName);
    const entry = (history.versions || []).find(item => item.version === v);
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Không tìm thấy phiên bản' }));
      return;
    }
    const backupFilePath = path.join(getItemHistoryDir(safeName), entry.backupFile);
    if (!fs.existsSync(backupFilePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File không tồn tại trên ổ đĩa' }));
      return;
    }

    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext);
    const downloadName = `${base}_v${v}${ext}`;

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadName)}"`,
      'Content-Length': fs.statSync(backupFilePath).size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(backupFilePath).pipe(res);
    return;
  }

  // 5. VIEW FILE OR PROJECT FOLDER (Native browser render with relative asset resolution)
  if (req.method === 'GET' && pathname.startsWith('/view/')) {
    const subpath = pathname.slice('/view/'.length);
    // Sanitize subpath: prevent ".." traversal
    const safeSubpath = subpath.replace(/\\/g, '/').split('/').filter(p => p !== '..').join('/');
    let targetPath = path.join(UPLOADS_DIR, safeSubpath);

    // If file doesn't exist, check aliases mapping
    if (!fs.existsSync(targetPath)) {
      const aliases = getAliases();
      const firstPart = safeSubpath.split('/')[0];
      if (aliases[firstPart]) {
        const mappedTarget = aliases[firstPart];
        const remainder = safeSubpath.split('/').slice(1).join('/');
        targetPath = path.join(UPLOADS_DIR, remainder ? path.join(mappedTarget, remainder) : mappedTarget);
      }
    }

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
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
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


