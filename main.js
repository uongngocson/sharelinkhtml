const { app, BrowserWindow, Tray, Menu, shell, clipboard, Notification, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. MUST check single instance lock FIRST before loading anything else
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // If an instance is already running, exit immediately
  app.quit();
  process.exit(0);
}

// 2. Load Server module only in the primary instance
const { startServer, PORT, getPrimaryIp, UPLOADS_DIR } = require('./server.js');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// When a second instance tries to launch, bring window to front or recreate it!
app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(false);
  } else {
    createWindow();
  }
});

function getAppIcon() {
  const icoPath = path.join(__dirname, 'assets', 'icon.ico');
  if (fs.existsSync(icoPath)) {
    return nativeImage.createFromPath(icoPath);
  }
  const pngPath = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(pngPath)) {
    return nativeImage.createFromPath(pngPath);
  }
  return nativeImage.createEmpty();
}

function getTrayIcon() {
  const icon = getAppIcon();
  if (!icon.isEmpty()) {
    try {
      return icon.resize({ width: 16, height: 16 });
    } catch (e) {
      return icon;
    }
  }
  return icon;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1160,
    height: 820,
    minWidth: 850,
    minHeight: 600,
    backgroundColor: '#020617', // slate-950 dark background
    autoHideMenuBar: true,
    title: 'HTML Share Hub - LAN Server',
    icon: getAppIcon(),
    show: false, // show gracefully once ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  const lanIp = getPrimaryIp();
  const hubUrl = `http://localhost:${PORT}`;

  // Gracefully show window when ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) mainWindow.show();
  });

  // Auto-retry if initial load fails
  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(hubUrl);
      }
    }, 500);
  });

  // Load the web hub
  mainWindow.loadURL(hubUrl);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handle close: minimize to tray if tray exists, otherwise quit
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      if (tray) {
        event.preventDefault();
        mainWindow.hide();
        
        try {
          if (Notification.isSupported()) {
            new Notification({
              title: 'HTML Share Hub đang chạy ngầm',
              body: `Server LAN đang hoạt động tại http://${lanIp}:${PORT}. Bấm đúp vào biểu tượng khay hệ thống để mở lại.`,
              icon: getAppIcon()
            }).show();
          }
        } catch (e) {}
      } else {
        // If tray is not available, allow quitting so no invisible orphan process remains
        isQuitting = true;
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  try {
    const lanIp = getPrimaryIp();
    const lanUrl = `http://${lanIp}:${PORT}`;
    const icon = getTrayIcon();

    tray = new Tray(icon);
    tray.setToolTip(`HTML Share Hub - Đang hoạt động (${lanUrl})`);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '🌐 Mở Giao Diện Dashboard',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        }
      },
      {
        label: `📋 Sao Chép Link LAN (${lanIp}:${PORT})`,
        click: () => {
          clipboard.writeText(lanUrl);
          try {
            if (Notification.isSupported()) {
              new Notification({
                title: 'Đã sao chép link LAN!',
                body: lanUrl
              }).show();
            }
          } catch (e) {}
        }
      },
      { type: 'separator' },
      {
        label: '📁 Mở Thư Mục File Đã Lưu',
        click: () => {
          shell.openPath(UPLOADS_DIR);
        }
      },
      {
        label: '🔄 Tải Lại Trang (Reload)',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
        }
      },
      { type: 'separator' },
      {
        label: '❌ Thoát Ứng Dụng Hoàn Toàn',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    // Double click tray icon to toggle window
    tray.on('double-click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        createWindow();
      }
    });
  } catch (err) {
    console.warn('⚠️ Tray creation skipped or failed:', err.message);
    tray = null;
  }
}

app.whenReady().then(async () => {
  // Start server safely
  await startServer(PORT);
  
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});
