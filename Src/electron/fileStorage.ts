import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { GenerationMode, ImageSize, SavedImage } from '../shared/types';

// Local on-disk storage for generated/remixed images and their metadata.

function imagesDir(): string {
  return path.join(app.getPath('userData'), 'imagemix', 'images');
}

function metadataFile(): string {
  return path.join(app.getPath('userData'), 'imagemix', 'library.json');
}

async function ensureStorage(): Promise<void> {
  await fs.mkdir(imagesDir(), { recursive: true });
  try {
    await fs.access(metadataFile());
  } catch {
    await fs.writeFile(metadataFile(), JSON.stringify([], null, 2), 'utf-8');
  }
}

export async function readLibrary(): Promise<SavedImage[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(metadataFile(), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedImage[]) : [];
  } catch {
    return [];
  }
}

async function writeLibrary(images: SavedImage[]): Promise<void> {
  await ensureStorage();
  await fs.writeFile(metadataFile(), JSON.stringify(images, null, 2), 'utf-8');
}

export interface SaveImageInput {
  base64: string;
  prompt: string;
  model: string;
  mode: GenerationMode;
  size?: ImageSize;
  sourceImageIds?: string[];
}

export async function saveImage(input: SaveImageInput): Promise<SavedImage> {
  await ensureStorage();
  const id = randomUUID();
  const fileName = `${id}.png`;
  const filePath = path.join(imagesDir(), fileName);
  await fs.writeFile(filePath, Buffer.from(input.base64, 'base64'));

  const record: SavedImage = {
    id,
    fileName,
    prompt: input.prompt,
    model: input.model,
    mode: input.mode,
    size: input.size,
    sourceImageIds: input.sourceImageIds,
    createdAt: new Date().toISOString()
  };

  const library = await readLibrary();
  library.unshift(record);
  await writeLibrary(library);
  return record;
}

export async function getImageDataUrl(id: string): Promise<string | null> {
  const library = await readLibrary();
  const record = library.find((image) => image.id === id);
  if (!record) {
    return null;
  }
  try {
    const buffer = await fs.readFile(path.join(imagesDir(), record.fileName));
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function deleteImage(id: string): Promise<void> {
  const library = await readLibrary();
  const record = library.find((image) => image.id === id);
  if (record) {
    try {
      await fs.unlink(path.join(imagesDir(), record.fileName));
    } catch {
      // Ignore missing files.
    }
  }
  await writeLibrary(library.filter((image) => image.id !== id));
}

export function getImageFilePath(fileName: string): string {
  return path.join(imagesDir(), fileName);
}

export function getSaveLocation(): string {
  return imagesDir();
}
