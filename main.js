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

// When a second instance tries to launch, focus our main window!
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

function getAppIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return nativeImage.createEmpty();
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  const lanIp = getPrimaryIp();
  const hubUrl = `http://localhost:${PORT}`;

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

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      if (Notification.isSupported()) {
        new Notification({
          title: 'HTML Share Hub đang chạy ngầm',
          body: `Server LAN đang hoạt động tại http://${lanIp}:${PORT}. Bấm đúp vào biểu tượng khay hệ thống để mở lại.`,
          icon: getAppIcon()
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const lanIp = getPrimaryIp();
  const lanUrl = `http://${lanIp}:${PORT}`;

  tray = new Tray(getAppIcon());
  tray.setToolTip(`HTML Share Hub - Đang hoạt động (${lanUrl})`);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🌐 Mở Giao Diện Dashboard',
      click: () => {
        if (mainWindow) {
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
        if (Notification.isSupported()) {
          new Notification({
            title: 'Đã sao chép link LAN!',
            body: lanUrl
          }).show();
        }
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
        if (mainWindow) mainWindow.reload();
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
    if (mainWindow) {
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
