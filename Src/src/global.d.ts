import type { ImageMixApi } from '../shared/types';

declare global {
  interface Window {
    imageMix: ImageMixApi;
  }
}

export {};
