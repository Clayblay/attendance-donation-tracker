const { app, BrowserWindow, protocol, net, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const isDev = process.argv.includes('--dev');
const DEV_URL = 'http://localhost:8081'; // Expo web dev server
const WEB_ROOT = path.join(__dirname, 'web'); // copy of the Expo web export

// Serve the exported site from a custom "app://" scheme so the absolute
// asset paths produced by Expo (/_expo/static/...) work outside a web server.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    let filePath = path.normalize(path.join(WEB_ROOT, decodeURIComponent(pathname)));
    if (!filePath.startsWith(WEB_ROOT)) {
      return new Response('Forbidden', { status: 403 });
    }
    // Unknown paths fall back to index.html (single-page app routing).
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(WEB_ROOT, 'index.html');
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0E1917',
    autoHideMenuBar: true,
    title: 'Attendance Tracker',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  // Open external links in the user's browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(DEV_URL);
  } else if (fs.existsSync(path.join(WEB_ROOT, 'index.html'))) {
    win.loadURL('app://localhost/');
  } else {
    dialog.showErrorBox(
      'Web build not found',
      'Run "npm run desktop:web" from the project root first.'
    );
    app.quit();
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    registerAppProtocol();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
