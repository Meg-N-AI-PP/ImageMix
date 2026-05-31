import type { ImageSize } from '../../shared/types';

export interface ModelOption {
  id: string;
  label: string;
}

// Image generation / editing models. Model IDs can change over time; update
// these to match what is available in your OpenAI account.
export const imageModels: ModelOption[] = [
  { id: 'gpt-image-2', label: 'GPT Image 2' },
  { id: 'gpt-image-1', label: 'GPT Image 1' }
];

// Text models used by the Prompt Mixer to combine/improve prompts.
export const textModels: ModelOption[] = [
  { id: 'gpt-5.5', label: 'GPT 5.5' },
  { id: 'gpt-4.1', label: 'GPT 4.1' },
  { id: 'gpt-4o', label: 'GPT 4o' }
];

export interface SizeOption {
  id: ImageSize;
  label: string;
}

export const sizeOptions: SizeOption[] = [
  { id: '1024x1024', label: 'Square (1024 x 1024)' },
  { id: '1024x1536', label: 'Portrait (1024 x 1536)' },
  { id: '1536x1024', label: 'Landscape (1536 x 1024)' }
];

export const stylePresets: string[] = [
  'Cinematic',
  'Watercolor',
  'Realistic',
  'Anime',
  'Product render',
  'Poster',
  'Surreal'
];

export const defaultImageModel = imageModels[0].id;
export const defaultTextModel = textModels[0].id;
export const defaultSize: ImageSize = '1024x1024';
