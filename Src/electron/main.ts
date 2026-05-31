import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { IpcChannels } from '../shared/ipc';
import { registerImageHandlers } from './ipc/imageGenerationHandlers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#1b1a19',
    title: 'ImageMix',
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
    void win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  await loadEnv();
  registerImageHandlers();

  ipcMain.handle(IpcChannels.getAppVersion, () => app.getVersion());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
