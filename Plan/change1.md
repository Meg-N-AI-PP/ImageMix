# Change 1 Implementation

## Status

- The app is stopped. No Electron or Node process from `C:\Users\ADMIN\Desktop\ImageFusion` was running when checked.
- Source reviewed under `Src/src`, `Src/shared`, and `Src/electron`.
- This plan is designed for the current React + Fluent UI + Electron + OpenAI structure.

## Source Findings

1. `Src/src/components/AppShell.tsx` owns navigation with local `tab` state.
2. `Src/src/features/library/LibraryView.tsx` already supports `onUsedAsSource` and calls it after adding an image to the fusion source selection.
3. `Src/src/features/generate/GenerateView.tsx` adds the generated image into `useSelection()`, but it has no navigation callback, so it stays on the Generate screen.
4. `Src/src/features/fusion/FusionView.tsx` uses `togglePreset()` for both tag click and tag dismiss. Clicking the dismiss X can bubble into the tag click and toggle the preset back on.
5. `Src/src/hooks/useSelection.tsx` stores selected fusion images as `SelectedSource[]` with `id`, `name`, `dataUrl`, and optional `libraryId`. It does not store source percentages.
6. `Src/shared/types.ts` and `Src/electron/openaiClient.ts` support multiple source images for image edit, but OpenAI image edit has no native percentage field. Percentages must be validated in the UI and encoded into the prompt sent to OpenAI.
7. `Src/src/features/promptMixer/PromptMixerView.tsx` is text-only today. It calls `imageApi.improvePrompt()` with `prompts: string[]`, then generates with `mode: 'text-fusion'` and no images.
8. `Src/electron/openaiClient.ts` already defaults Prompt Mixer model choices to `gpt-5.5` through `defaultTextModel`, but `improvePrompt()` currently sends text-only chat content.
9. `Src/src/features/library/LibraryView.tsx` preview uses `maxHeight: '60vh'`, so a 1024 x 1024 image is scaled down in the dialog.

## Implementation Steps

### 1. Navigate to Fusion after using a generated image as source

Files:

- `Src/src/components/AppShell.tsx`
- `Src/src/features/generate/GenerateView.tsx`

Implementation:

1. Add a prop to `GenerateView`:

```ts
interface GenerateViewProps {
  onUsedAsSource?: () => void;
}

export function GenerateView({ onUsedAsSource }: GenerateViewProps) {
```

2. After `GenerateView.onUseAsSource()` calls `add(...)`, call `onUsedAsSource?.()`.
3. In `AppShell`, render Generate with the same navigation pattern already used by Library:

```tsx
{tab === 'generate' ? (
  <GenerateView onUsedAsSource={() => setTab('fusion')} />
) : null}
```

Expected result:

- Generate image -> Use as fusion source -> source is added -> active tab changes to Fusion.

### 2. Fix style preset X dismiss in Fusion

File:

- `Src/src/features/fusion/FusionView.tsx`

Implementation:

1. Split the current toggle-only behavior into explicit helpers:

```ts
const addPreset = (preset: string) => {
  setPresets((current) =>
    current.includes(preset) ? current : [...current, preset]
  );
};

const removePreset = (preset: string) => {
  setPresets((current) => current.filter((p) => p !== preset));
};

const togglePreset = (preset: string) => {
  setPresets((current) =>
    current.includes(preset)
      ? current.filter((p) => p !== preset)
      : [...current, preset]
  );
};
```

2. Use `removePreset` for `TagGroup.onDismiss`, and stop the dismiss event from also triggering the tag click:

```tsx
<TagGroup
  onDismiss={(event, data) => {
    event.stopPropagation();
    removePreset(String(data.value));
  }}
>
```

3. Keep `onClick={() => togglePreset(preset)}` on the tag for normal selection and unselection by clicking the chip itself.

Expected result:

- Clicking a preset selects it.
- Clicking the selected preset chip can toggle it off.
- Clicking the X removes it and does not re-add it.

### 3. Add per-image percentages to Fusion

Files:

- `Src/src/hooks/useSelection.tsx`
- `Src/src/components/ImageThumbnailList.tsx`
- `Src/src/features/fusion/FusionView.tsx`
- Optional metadata extension: `Src/shared/types.ts`, `Src/electron/fileStorage.ts`, `Src/electron/ipc/imageGenerationHandlers.ts`

Implementation:

1. Extend `SelectedSource`:

```ts
export interface SelectedSource {
  id: string;
  name: string;
  dataUrl: string;
  libraryId?: string;
  weightPercent: number;
}
```

2. Extend `SelectionContextValue`:

```ts
updateWeight: (id: string, weightPercent: number) => void;
```

3. Add a helper in `useSelection.tsx` to keep default weights usable when sources are added or removed:

```ts
function distributeWeights<T extends { weightPercent?: number }>(sources: T[]): Array<T & { weightPercent: number }> {
  if (!sources.length) {
    return [];
  }
  const base = Math.floor(100 / sources.length);
  let remainder = 100 - base * sources.length;
  return sources.map((source) => ({
    ...source,
    weightPercent: source.weightPercent ?? base + (remainder-- > 0 ? 1 : 0)
  }));
}
```

4. When `add`, `addMany`, or `remove` changes the source list, call `distributeWeights(...)` on the resulting list. For `updateWeight`, clamp numeric values to `0..100` and update only that source:

```ts
const updateWeight = useCallback((id: string, weightPercent: number) => {
  const nextWeight = Math.max(0, Math.min(100, Math.round(weightPercent)));
  setSources((current) =>
    current.map((source) =>
      source.id === id ? { ...source, weightPercent: nextWeight } : source
    )
  );
}, []);
```

5. Update all calls to `add(...)` and `addMany(...)` to either omit `weightPercent` and let the provider assign it, or pass the current default. This affects Generate, Library, and Fusion dropzone usage.
6. Add percentage inputs to `ImageThumbnailList`:

```ts
onWeightChange?: (id: string, weightPercent: number) => void;
showWeights?: boolean;
```

Use Fluent `Field` + `Input` with `type="number"`, `min={0}`, `max={100}`, and a `%` suffix. Keep the thumbnail dimensions stable so the list does not jump when values change.
7. In `FusionView`, read `updateWeight` from `useSelection()`, compute the total, and block generation unless the total is exactly 100:

```ts
const totalWeight = sources.reduce((sum, source) => sum + source.weightPercent, 0);
const weightsValid = sources.length > 0 && totalWeight === 100;
```

8. Show a warning `MessageBar` when `sources.length > 0 && !weightsValid`, for example `Source percentages must total 100%. Current total: ${totalWeight}%.`
9. Build the final fusion prompt from all required parts: user fusion instructions, selected style presets, and source weights.

```ts
function buildFusionPrompt(prompt: string, presets: string[], sources: SelectedSource[]): string {
  const parts = [prompt.trim()];
  if (presets.length) {
    parts.push(`Style presets: ${presets.join(', ')}.`);
  }
  parts.push(
    `Source image weights: ${sources
      .map((source, index) => `Image ${index + 1} (${source.name}) ${source.weightPercent}%`)
      .join('; ')}. Respect these proportions in the final fusion.`
  );
  return parts.filter(Boolean).join('\n\n');
}
```

10. Use `buildFusionPrompt(...)` in `onGenerate()` instead of the current ``${prompt}${styleText}`.trim()` logic.

Expected result:

- Each selected Fusion image has an editable percentage.
- Generate is disabled until the source percentages total 100%.
- The OpenAI request includes fusion instructions, selected styles, and the image percentage instructions.

Optional metadata:

- Add `sourceWeights?: Array<{ sourceImageId?: string; name: string; weightPercent: number }>` to `GenerationRequest` and `SavedImage` if the library should remember the exact weights used. This is not required for generation, because the prompt already carries the weights.

### 4. Add image items and percentages to Prompt Mixer

Files:

- `Src/src/features/promptMixer/PromptMixerView.tsx`
- `Src/shared/types.ts`
- `Src/electron/openaiClient.ts`
- Optional reusable UI: `Src/src/components/WeightedSourceList.tsx`

Implementation:

1. Replace `ideas: string[]` with typed mixer items:

```ts
type MixerItem =
  | {
      id: string;
      kind: 'text';
      text: string;
      weightPercent: number;
    }
  | {
      id: string;
      kind: 'image';
      image: SourceImage;
      previewUrl: string;
      weightPercent: number;
    };
```

2. Initialize with two text items at 50% each. Add helper functions to add text, remove item, update text, add images from `ImageDropzone`, and update item weight.
3. Use a shared helper to distribute default weights after add/remove. The same helper can be moved to a small renderer utility if Fusion and Prompt Mixer both need it.
4. Add an `ImageDropzone` section under Prompt Mixer so users can add local PNG, JPG, or WEBP images as mixer ideas.
5. Render text items with `Input` plus a `%` number input. Render image items with a thumbnail, name, remove button, and a `%` number input.
6. Compute `totalWeight` for all active text and image items. Disable `Improve & combine prompt` and `Generate from prompt` unless the total is 100 and at least one item has usable text or image data.
7. Extend shared types so the backend can receive weighted text and image ideas:

```ts
export type PromptMixerInput =
  | {
      kind: 'text';
      text: string;
      weightPercent: number;
    }
  | {
      kind: 'image';
      image: SourceImage;
      weightPercent: number;
    };

export interface ImprovePromptRequest {
  model: string;
  prompts?: string[];
  items?: PromptMixerInput[];
  instruction?: string;
}
```

Keep `prompts?: string[]` temporarily for backward compatibility with any existing callers.
8. In `PromptMixerView.onImprove()`, call `imageApi.improvePrompt()` with `model: 'gpt-5.5'` and `items`. Include an instruction that the returned prompt must respect each item percentage.

```ts
const result = await imageApi.improvePrompt({
  model: 'gpt-5.5',
  items: mixerItems.map(toPromptMixerInput),
  instruction:
    'Create one final image generation prompt from these weighted text and image ideas. Respect each percentage as the intended influence. Return only the final prompt text.'
});
```

9. Update `Src/electron/openaiClient.ts improvePrompt()`:

- If `request.items` is absent, keep the existing text-only path.
- If `request.items` is present, build a multimodal user message for `gpt-5.5`.
- Add text content that lists item weights and text ideas.
- Add image content parts for image items using their data URLs.

Example backend shape:

```ts
const content: Array<
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
> = [
  {
    type: 'text',
    text: `${instruction}\n\nWeighted items:\n${weightedSummary}`
  },
  ...imageItems.map((item) => ({
    type: 'image_url' as const,
    image_url: { url: item.image.data.startsWith('data:') ? item.image.data : `data:image/png;base64,${item.image.data}` }
  }))
];
```

10. In `PromptMixerView.onGenerate()`, include image items in the generation request when any images are present:

```ts
const imageItems = mixerItems.filter((item) => item.kind === 'image');
const result = await generate({
  mode: imageItems.length
    ? mixerItems.some((item) => item.kind === 'text' && item.text.trim())
      ? 'text-image-fusion'
      : 'image-fusion'
    : 'text-fusion',
  prompt: finalPromptWithWeights,
  model: imageModel,
  size,
  images: imageItems.map((item) => item.image)
});
```

11. `finalPromptWithWeights` should be the combined prompt plus a compact weighted item summary. This keeps the image generation model aware of the percentages even after the text model creates the final prompt.

Expected result:

- Prompt Mixer can mix text with text, text with images, and images with images.
- Each item has a percentage.
- Item percentages must total 100%.
- `gpt-5.5` creates the final conclusion prompt before image generation.
- If image items are present, generation uses the existing `images.edit` path through `generateImage()`.

### 5. Show full 1024 x 1024 library preview

File:

- `Src/src/features/library/LibraryView.tsx`

Implementation:

1. Add larger dialog styles:

```ts
previewSurface: {
  width: 'min(1024px, calc(100vw - 48px))',
  maxWidth: 'calc(100vw - 48px)'
},
previewContent: {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacingVerticalS,
  alignItems: 'center',
  overflow: 'auto'
},
previewImg: {
  width: 'min(1024px, 100%)',
  height: 'auto',
  maxHeight: 'calc(100vh - 220px)',
  objectFit: 'contain'
}
```

2. Apply `className={styles.previewSurface}` to `DialogSurface` for the preview dialog.
3. Apply `className={styles.previewContent}` to the preview `DialogContent`.
4. Keep the prompt text below the image, but ensure it does not shrink the image before viewport limits apply.

Expected result:

- A square 1024 x 1024 image displays at full size on screens that can fit it.
- On smaller screens, the preview remains fully visible with `objectFit: contain` and dialog scrolling.

## Validation Checklist

Run from `Src`:

```powershell
npm run typecheck
npm run build:renderer
npm run start
```

Manual checks:

1. Generate an image, click `Use as fusion source`, and verify the app switches to Fusion with the generated image selected.
2. In Fusion, select a style preset, click its X, and verify it is removed.
3. In Fusion, add two images. Verify default percentages total 100, changing one value updates the total warning, and generation is disabled until the total returns to 100.
4. In Fusion, generate and verify the saved library prompt contains the fusion instruction, selected styles, and source percentage summary.
5. In Prompt Mixer, mix two text ideas, text plus image, and image plus image. Verify percentages are required to total 100 and `gpt-5.5` produces the final prompt before generation.
6. In Library, preview a 1024 x 1024 image on a large enough viewport and verify it is shown at full size. Resize smaller and verify it remains contained and scrollable.

## Important Note About Percentages

The OpenAI image edit request used by this app accepts a prompt and one or more source images, but it does not expose a separate numeric influence or weight parameter per source image. The reliable implementation is to validate percentages in the UI and include them explicitly in the prompt text sent to the model.