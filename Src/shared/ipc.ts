// Central IPC channel names shared between main and preload.
export const IpcChannels = {
  generate: 'imagemix:generate',
  improvePrompt: 'imagemix:improve-prompt',
  listLibrary: 'imagemix:list-library',
  getImageDataUrl: 'imagemix:get-image-data-url',
  deleteImage: 'imagemix:delete-image',
  exportImage: 'imagemix:export-image',
  copyImage: 'imagemix:copy-image',
  getApiKeyStatus: 'imagemix:get-api-key-status',
  setApiKey: 'imagemix:set-api-key',
  getSaveLocation: 'imagemix:get-save-location',
  getAppVersion: 'imagemix:get-app-version',
  hideToTray: 'imagemix:hide-to-tray',
  widgetRestore: 'imagemix:widget-restore',
  widgetMoveBy: 'imagemix:widget-move-by'
} as const;
