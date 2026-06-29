import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { readFileSync } from 'node:fs';
import { IpcChannels } from '../shared/ipc';
import { registerImageHandlers } from './ipc/imageGenerationHandlers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let miniWidget: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Icons live in build/icons during development and are copied to
// resources/icons in packaged builds (electron-builder extraResources).
function resolveAssetPath(...segments: string[]): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'icons')
    : path.join(__dirname, '..', 'build', 'icons');
  return path.join(base, ...segments);
}

// Load environment variables from a .env file in the project root if present.
// A tiny parser is used to avoid an extra runtime dependency.
async function loadEnv(): Promise<void> {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env')
  ];
  for (const file of candidates) {
    try {
      const raw = await fs.readFile(file, 'utf-8');
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }
        const eq = trimmed.indexOf('=');
        if (eq === -1) {
          continue;
        }
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
      return;
    } catch {
      // Try next candidate.
    }
  }
}

const DEV_SERVER_URL = 'http://localhost:5173';

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#1b1a19',
    title: 'ImageMix',
    icon: resolveAssetPath(
      process.platform === 'win32' ? 'icon.ico' : 'icon.png'
    ),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // vite-plugin-electron sets VITE_DEV_SERVER_URL while the dev server runs.
  const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? DEV_SERVER_URL;
  if (process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development') {
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Closing the window hides the app to the tray instead of quitting. The
  // floating widget is shown only on demand from the tray menu. A real quit
  // only happens when isQuitting is set (tray Exit).
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideToTray();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showMainWindow(): void {
  if (!mainWindow) {
    createWindow();
    return;
  }
  miniWidget?.hide();
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.setSkipTaskbar(false);
  mainWindow.show();
  mainWindow.focus();
}

function hideToTray(): void {
  if (!mainWindow) {
    return;
  }
  mainWindow.hide();
  mainWindow.setSkipTaskbar(true);
}

function hideMiniWidget(): void {
  miniWidget?.hide();
}

// The floating logo bubble is a small frameless always-on-top window that
// stays visible while the main window is hidden. Clicking it restores the app.
function buildWidgetHtml(): string {
  let logoSrc = '';
  try {
    const bytes = readFileSync(resolveAssetPath('logo.png'));
    logoSrc = `data:image/png;base64,${bytes.toString('base64')}`;
  } catch {
    logoSrc = '';
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        overflow: hidden;
        -webkit-user-select: none;
        user-select: none;
        cursor: pointer;
      }
      #bubble {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        overflow: hidden;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
        background: #5b5fc7;
      }
      #bubble img {
        width: 100%;
        height: 100%;
        display: block;
        -webkit-user-drag: none;
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div id="bubble" title="Show ImageMix">
      ${logoSrc ? `<img src="${logoSrc}" alt="ImageMix" />` : 'IM'}
    </div>
    <script>
      const DRAG_THRESHOLD = 4;
      let dragging = false;
      let movedDistance = 0;
      window.addEventListener('mousedown', () => {
        dragging = true;
        movedDistance = 0;
      });
      window.addEventListener('mousemove', (event) => {
        if (!dragging) {
          return;
        }
        movedDistance += Math.abs(event.movementX) + Math.abs(event.movementY);
        window.imageMixWidget?.moveBy(event.movementX, event.movementY);
      });
      window.addEventListener('mouseup', () => {
        if (!dragging) {
          return;
        }
        dragging = false;
        if (movedDistance < DRAG_THRESHOLD) {
          window.imageMixWidget?.restore();
        }
      });
    </script>
  </body>
</html>`;
}

function createMiniWidget(): void {
  miniWidget = new BrowserWindow({
    width: 64,
    height: 64,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  miniWidget.setAlwaysOnTop(true, 'screen-saver');
  void miniWidget.loadURL(
    `data:text/html;charset=UTF-8,${encodeURIComponent(buildWidgetHtml())}`
  );

  miniWidget.on('closed', () => {
    miniWidget = null;
  });
}

function showMiniWidget(): void {
  if (!miniWidget) {
    createMiniWidget();
  }
  if (!miniWidget) {
    return;
  }
  // Position near the top-right of where the main window was.
  const bounds = mainWindow?.getBounds();
  if (bounds) {
    const x = bounds.x + bounds.width - 80;
    const y = bounds.y + 24;
    miniWidget.setPosition(Math.round(x), Math.round(y));
  }
  miniWidget.show();
}

function createTray(): void {
  const image = nativeImage.createFromPath(resolveAssetPath('tray.png'));
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.setToolTip('ImageMix');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show ImageMix', click: () => showMainWindow() },
    { label: 'Hide to Tray', click: () => hideToTray() },
    { type: 'separator' },
    { label: 'Show Widget', click: () => showMiniWidget() },
    { label: 'Hide Widget', click: () => hideMiniWidget() },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => showMainWindow());
  tray.on('double-click', () => showMainWindow());
}

function registerWindowHandlers(): void {
  ipcMain.on(IpcChannels.widgetRestore, () => showMainWindow());
  ipcMain.on(IpcChannels.widgetMoveBy, (_event, deltaX: number, deltaY: number) => {
    if (!miniWidget) {
      return;
    }
    const [x, y] = miniWidget.getPosition();
    miniWidget.setPosition(
      Math.round(x + (deltaX ?? 0)),
      Math.round(y + (deltaY ?? 0))
    );
  });
  ipcMain.handle(IpcChannels.hideToTray, () => hideToTray());
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

app.whenReady().then(async () => {
  await loadEnv();
  registerImageHandlers();
  registerWindowHandlers();

  ipcMain.handle(IpcChannels.getAppVersion, () => app.getVersion());

  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showMainWindow();
    }
  });
});

// Stay alive in the tray when the window is hidden/closed. A real quit only
// happens through the tray Exit action (isQuitting) or an OS-level quit.
app.on('window-all-closed', () => {
  // Intentionally no-op: the app keeps running in the tray.
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  tray?.destroy();
  tray = null;
});
