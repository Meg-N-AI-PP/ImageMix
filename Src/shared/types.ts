// Shared types used by both the Electron main process and the React renderer.

export type GenerationMode =
  | 'text-to-image'
  | 'image-fusion'
  | 'text-image-fusion'
  | 'text-fusion'
  | 'image-edit'
  | 'scene-next-image';

export type ImageSize = '1024x1024' | '1024x1536' | '1536x1024';

export interface SavedImage {
  id: string;
  fileName: string;
  prompt: string;
  model: string;
  mode: GenerationMode;
  sourceImageIds?: string[];
  size?: ImageSize;
  createdAt: string;
}

export interface SourceImage {
  // base64 data URL or raw base64 string of an input image
  data: string;
  name: string;
}

export interface GenerationRequest {
  mode: GenerationMode;
  prompt: string;
  model: string;
  size?: ImageSize;
  // base64 (no data URL prefix) source images for fusion modes
  images?: SourceImage[];
  sourceImageIds?: string[];
}

export interface GenerationResult {
  success: boolean;
  image?: SavedImage;
  // data URL for immediate preview
  dataUrl?: string;
  error?: string;
}

export interface ImprovePromptRequest {
  model: string;
  prompts?: string[];
  items?: PromptMixerInput[];
  instruction?: string;
}

export type PromptMixerInput =
  | { type: 'text'; text: string; weightPercent: number }
  | { type: 'image'; data: string; name: string; weightPercent: number };

export interface ImprovePromptResult {
  success: boolean;
  prompt?: string;
  error?: string;
}

export interface LibraryListResult {
  images: Array<SavedImage & { dataUrl: string }>;
}

export interface ApiKeyStatus {
  configured: boolean;
}

export interface ExportResult {
  success: boolean;
  canceled?: boolean;
  path?: string;
  error?: string;
}

export interface CopyImageResult {
  success: boolean;
  error?: string;
}

// The API surface exposed to the renderer through the preload bridge.
export interface ImageMixApi {
  generate(request: GenerationRequest): Promise<GenerationResult>;
  improvePrompt(request: ImprovePromptRequest): Promise<ImprovePromptResult>;
  listLibrary(): Promise<LibraryListResult>;
  getImageDataUrl(id: string): Promise<string | null>;
  deleteImage(id: string): Promise<{ success: boolean; error?: string }>;
  exportImage(id: string): Promise<ExportResult>;
  copyImage(dataUrl: string): Promise<CopyImageResult>;
  getApiKeyStatus(): Promise<ApiKeyStatus>;
  getSaveLocation(): Promise<string>;
  getAppVersion(): Promise<string>;
}
