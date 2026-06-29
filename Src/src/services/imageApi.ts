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

// Thin typed wrapper around the preload bridge so views never touch window
// globals directly.
const api = (): typeof window.imageMix => {
  if (!window.imageMix) {
    throw new Error('ImageMix bridge is not available.');
  }
  return window.imageMix;
};

export const imageApi = {
  generate: (request: GenerationRequest): Promise<GenerationResult> =>
    api().generate(request),
  improvePrompt: (request: ImprovePromptRequest): Promise<ImprovePromptResult> =>
    api().improvePrompt(request),
  listLibrary: (): Promise<LibraryListResult> => api().listLibrary(),
  getImageDataUrl: (id: string): Promise<string | null> =>
    api().getImageDataUrl(id),
  deleteImage: (id: string): Promise<{ success: boolean; error?: string }> =>
    api().deleteImage(id),
  exportImage: (id: string): Promise<ExportResult> => api().exportImage(id),
  copyImage: (dataUrl: string): Promise<CopyImageResult> =>
    api().copyImage(dataUrl),
  getApiKeyStatus: (): Promise<ApiKeyStatus> => api().getApiKeyStatus(),
  setApiKey: (key: string): Promise<ApiKeyStatus> => api().setApiKey(key),
  getSaveLocation: (): Promise<string> => api().getSaveLocation(),
  getAppVersion: (): Promise<string> => api().getAppVersion()
};
