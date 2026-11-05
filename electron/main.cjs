const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const DEFAULT_SERVER_URL = process.env.CATAN_SERVER_URL || 'http://localhost:3000';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Checks if a local or remote Catan server is reachable.
 */
function checkServerReachable(urlStr, timeoutMs = 800) {
  return new Promise((resolve) => {
    try {
      const req = http.get(urlStr, { timeout: timeoutMs }, (res) => {
        res.resume();
        resolve(res.statusCode && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Starts a lightweight embedded static file server for `dist/` so that
 * root-relative asset paths (`/assets/terrains/*.jpg`, `/assets/cards/*.jpg`)
 * work identically when packaged as a standalone `.exe` or `.app`.
 */
function startEmbeddedDistServer(distDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
      let safePath = path.normalize(decodeURIComponent(parsedUrl.pathname)).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(distDir, safePath);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    title: 'CATAN — Edición de Escritorio Multijugador',
    backgroundColor: '#0d0906',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isLocalServerUp = await checkServerReachable(DEFAULT_SERVER_URL);
  if (isLocalServerUp) {
    await mainWindow.loadURL(DEFAULT_SERVER_URL);
  } else {
    const distDir = path.join(__dirname, '../dist');
    if (fs.existsSync(path.join(distDir, 'index.html'))) {
      const embeddedUrl = await startEmbeddedDistServer(distDir);
      await mainWindow.loadURL(embeddedUrl);
    } else {
      await mainWindow.loadURL(DEFAULT_SERVER_URL);
    }
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
