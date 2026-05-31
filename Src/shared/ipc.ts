// Central IPC channel names shared between main and preload.
export const IpcChannels = {
  generate: 'imagemix:generate',
  improvePrompt: 'imagemix:improve-prompt',
  listLibrary: 'imagemix:list-library',
  getImageDataUrl: 'imagemix:get-image-data-url',
  deleteImage: 'imagemix:delete-image',
  exportImage: 'imagemix:export-image',
  getApiKeyStatus: 'imagemix:get-api-key-status',
  getSaveLocation: 'imagemix:get-save-location',
  getAppVersion: 'imagemix:get-app-version'
} as const;
