import { app } from 'electron';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';

// Small synchronous settings store persisted in the user's app data folder.
// Used to keep the OpenAI API key entered from the in-app Settings screen.

interface AppSettings {
  apiKey?: string;
}

function settingsDir(): string {
  return path.join(app.getPath('userData'), 'imagemix');
}

function settingsFile(): string {
  return path.join(settingsDir(), 'settings.json');
}

function readSettings(): AppSettings {
  try {
    const raw = readFileSync(settingsFile(), 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as AppSettings) : {};
  } catch {
    return {};
  }
}

function writeSettings(settings: AppSettings): void {
  if (!existsSync(settingsDir())) {
    mkdirSync(settingsDir(), { recursive: true });
  }
  writeFileSync(settingsFile(), JSON.stringify(settings, null, 2), 'utf-8');
}

export function getStoredApiKey(): string {
  const key = readSettings().apiKey;
  return typeof key === 'string' ? key.trim() : '';
}

export function setStoredApiKey(key: string): void {
  const settings = readSettings();
  settings.apiKey = typeof key === 'string' ? key.trim() : '';
  writeSettings(settings);
}
