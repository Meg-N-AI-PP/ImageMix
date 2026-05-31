import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from '../shared/ipc';
import type {
  ApiKeyStatus,
  ExportResult,
  GenerationRequest,
  GenerationResult,
  ImageMixApi,
  ImprovePromptRequest,
  ImprovePromptResult,
  LibraryListResult
} from '../shared/types';

// Only a narrow, typed API surface is exposed to the renderer.
const api: ImageMixApi = {
  generate: (request: GenerationRequest): Promise<GenerationResult> =>
    ipcRenderer.invoke(IpcChannels.generate, request),
  improvePrompt: (request: ImprovePromptRequest): Promise<ImprovePromptResult> =>
    ipcRenderer.invoke(IpcChannels.improvePrompt, request),
  listLibrary: (): Promise<LibraryListResult> =>
    ipcRenderer.invoke(IpcChannels.listLibrary),
  getImageDataUrl: (id: string): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.getImageDataUrl, id),
  deleteImage: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IpcChannels.deleteImage, id),
  exportImage: (id: string): Promise<ExportResult> =>
    ipcRenderer.invoke(IpcChannels.exportImage, id),
  getApiKeyStatus: (): Promise<ApiKeyStatus> =>
    ipcRenderer.invoke(IpcChannels.getApiKeyStatus),
  getSaveLocation: (): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.getSaveLocation),
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.getAppVersion)
};

contextBridge.exposeInMainWorld('imageMix', api);
