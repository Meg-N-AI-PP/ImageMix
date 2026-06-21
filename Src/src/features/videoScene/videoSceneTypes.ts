export interface VideoSceneImageSource {
  id: string;
  name: string;
  dataUrl: string;
  libraryId?: string;
}

export type EnvironmentChangeLevel = 'low' | 'medium' | 'high';

export interface CameraPositionOption {
  id: string;
  label: string;
  description: string;
  isCustom?: boolean;
}

export interface VideoSceneDraft {
  startImage?: VideoSceneImageSource;
  endImage?: VideoSceneImageSource;
}

export interface VideoPromptSet {
  durationSeconds: number | null;
  short: string;
  medium: string;
  large: string;
}
