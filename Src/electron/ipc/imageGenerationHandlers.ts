import { ipcMain, dialog, BrowserWindow, clipboard, nativeImage } from 'electron';
import { promises as fs } from 'node:fs';
import { IpcChannels } from '../../shared/ipc';
import type {
  ApiKeyStatus,
  CopyImageResult,
  ExportResult,
  GenerationRequest,
  GenerationResult,
  ImprovePromptRequest,
  ImprovePromptResult,
  LibraryListResult
} from '../../shared/types';
import {
  generateImage,
  improvePrompt,
  isApiKeyConfigured
} from '../openaiClient';
import { setStoredApiKey } from '../settingsStore';
import {
  deleteImage,
  getImageDataUrl,
  getImageFilePath,
  getSaveLocation,
  readLibrary,
  saveImage
} from '../fileStorage';

function toFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message || '';
    if (message.includes('429')) {
      return 'OpenAI rate limit reached. Please wait a moment and try again.';
    }
    if (message.toLowerCase().includes('api key')) {
      return message;
    }
    if (message.toLowerCase().includes('model')) {
      return `Model error: ${message}`;
    }
    if (
      message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('fetch')
    ) {
      return 'Network error contacting OpenAI. Check your connection and try again.';
    }
    return message;
  }
  return 'An unexpected error occurred.';
}

export function registerImageHandlers(): void {
  ipcMain.handle(
    IpcChannels.generate,
    async (_event, request: GenerationRequest): Promise<GenerationResult> => {
      try {
        if (!request.prompt || !request.prompt.trim()) {
          return { success: false, error: 'A prompt is required.' };
        }
        const base64 = await generateImage(request);
        const saved = await saveImage({
          base64,
          prompt: request.prompt,
          model: request.model,
          mode: request.mode,
          size: request.size,
          sourceImageIds: request.sourceImageIds
        });
        return {
          success: true,
          image: saved,
          dataUrl: `data:image/png;base64,${base64}`
        };
      } catch (error) {
        return { success: false, error: toFriendlyError(error) };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.improvePrompt,
    async (
      _event,
      request: ImprovePromptRequest
    ): Promise<ImprovePromptResult> => {
      try {
        const prompt = await improvePrompt(request);
        return { success: true, prompt };
      } catch (error) {
        return { success: false, error: toFriendlyError(error) };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.listLibrary,
    async (): Promise<LibraryListResult> => {
      const records = await readLibrary();
      const images = await Promise.all(
        records.map(async (record) => ({
          ...record,
          dataUrl: (await getImageDataUrl(record.id)) ?? ''
        }))
      );
      return { images: images.filter((image) => image.dataUrl) };
    }
  );

  ipcMain.handle(
    IpcChannels.getImageDataUrl,
    async (_event, id: string): Promise<string | null> => {
      return getImageDataUrl(id);
    }
  );

  ipcMain.handle(
    IpcChannels.deleteImage,
    async (_event, id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await deleteImage(id);
        return { success: true };
      } catch (error) {
        return { success: false, error: toFriendlyError(error) };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.exportImage,
    async (_event, id: string): Promise<ExportResult> => {
      try {
        const records = await readLibrary();
        const record = records.find((image) => image.id === id);
        if (!record) {
          return { success: false, error: 'Image not found.' };
        }
        const win = BrowserWindow.getFocusedWindow() ?? undefined;
        const result = await dialog.showSaveDialog(win!, {
          title: 'Export image',
          defaultPath: `imagemix-${id}.png`,
          filters: [{ name: 'PNG Image', extensions: ['png'] }]
        });
        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true };
        }
        await fs.copyFile(getImageFilePath(record.fileName), result.filePath);
        return { success: true, path: result.filePath };
      } catch (error) {
        return { success: false, error: toFriendlyError(error) };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.copyImage,
    async (_event, dataUrl: string): Promise<CopyImageResult> => {
      try {
        if (!dataUrl.startsWith('data:image/')) {
          return { success: false, error: 'Image data is invalid.' };
        }
        const image = nativeImage.createFromDataURL(dataUrl);
        if (image.isEmpty()) {
          return { success: false, error: 'Image data is empty.' };
        }
        clipboard.writeImage(image);
        return { success: true };
      } catch (error) {
        return { success: false, error: toFriendlyError(error) };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.getApiKeyStatus,
    async (): Promise<ApiKeyStatus> => {
      return { configured: isApiKeyConfigured() };
    }
  );

  ipcMain.handle(
    IpcChannels.setApiKey,
    async (_event, key: string): Promise<ApiKeyStatus> => {
      setStoredApiKey(typeof key === 'string' ? key : '');
      return { configured: isApiKeyConfigured() };
    }
  );

  ipcMain.handle(IpcChannels.getSaveLocation, async (): Promise<string> => {
    return getSaveLocation();
  });
}
