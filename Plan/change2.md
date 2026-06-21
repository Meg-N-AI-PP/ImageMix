# Change 2 Implementation Plan

Source request: [new Change2.md](new%20Change2.md)

## Goals

1. Add an image editing workflow where the user selects one or more images, writes edit instructions, and generates an edited result.
2. Let the user right-click any generated result image and copy it so it can be pasted into chats and other apps.
3. Add a scene continuation workflow that creates the last image/frame after a described action happens over a configurable number of seconds, with optional prompt enhancement.

## Existing Source Facts

- The renderer already uses shared generation plumbing through `useGeneration()` and `imageApi.generate()`.
- `electron/openaiClient.ts` already routes any request with `images` through `openai.images.edit(...)`, which supports the image-editing style workflows without a new OpenAI API path.
- `ImagePreview` is shared by Generate, Fusion, and Prompt Mixer result screens, so right-click copy can be implemented once there for generated result images.
- The app already has `ImageDropzone`, `ImageThumbnailList`, `PromptInput`, `ModelSelector`, `SizeSelector`, and library persistence for generated results.
- Prompt enhancement already exists through `imageApi.improvePrompt(...)`; the previous change added multimodal prompt improvement for text and image inputs.

## Design Choice

Implement image editing as a dedicated `Edit` screen instead of adding a Fusion/Edit mode switch inside Fusion.

Reason: editing has different copy, prompt, validation, and mental model from weighted fusion. A separate screen keeps Fusion focused on blend/weight workflows and makes Edit simpler for users.

Implement scene continuation as a dedicated `Scene` screen.

Reason: it needs a seconds control, optional enhancement, and a distinct primary action label (`Next Image`). A separate screen avoids overloading Generate or Fusion.

## Change 1: Image Editing Screen

### Files To Add

- `Src/src/features/edit/EditView.tsx`

### Files To Update

- `Src/src/components/AppShell.tsx`
- `Src/shared/types.ts`
- Optional: `Src/src/features/library/LibraryView.tsx` if adding a direct `Use as edit source` action from the library.

### Shared Types

Update `GenerationMode` in `Src/shared/types.ts`:

```ts
export type GenerationMode =
  | 'text-to-image'
  | 'image-fusion'
  | 'text-image-fusion'
  | 'text-fusion'
  | 'image-edit'
  | 'scene-next-image';
```

No separate backend handler is required for `image-edit` because `generateImage()` already uses `images.edit(...)` whenever `request.images` has at least one item.

### Edit View UI

Create `EditView` with the same two-column layout pattern as Fusion:

- Left card controls:
  - Title: `Edit Image`
  - `ImageDropzone` for one or more source images.
  - `ImageThumbnailList` with remove/reorder enabled.
  - Warning `MessageBar` for file errors.
  - `PromptInput` label: `Edit instructions`.
  - Placeholder example: `Change the jacket to red, keep the face and background unchanged`.
  - `ModelSelector` using `imageModels` and default `defaultImageModel`.
  - `SizeSelector` using `defaultSize`.
  - Primary button: `Edit image`.
- Right side:
  - `ImagePreview` for the generated edited result.
  - `onExport` wired to `imageApi.exportImage(lastId)`.

### Edit View State

Use local source state instead of `useSelection()` because editing should not share Fusion's global weighted source list.

Suggested local type:

```ts
interface EditSource {
  id: string;
  name: string;
  dataUrl: string;
  libraryId?: string;
}
```

The existing `ImageThumbnailList` expects `SelectedSource[]` with `weightPercent`, so either:

1. Add a smaller reusable `SourceThumbnailList` that accepts non-weighted sources, or
2. Reuse `ImageThumbnailList` by mapping edit sources to objects with `weightPercent: 0` and keeping `showWeights={false}`.

Prefer option 2 for a smaller implementation.

### Edit Generation Request

Validation:

- Disable `Edit image` while busy.
- Require at least one image.
- Require non-empty edit instructions.

Generate request:

```ts
await generate({
  mode: 'image-edit',
  prompt: buildEditPrompt(prompt, sources),
  model,
  size,
  images: sources.map((source) => ({
    data: source.dataUrl,
    name: source.name
  })),
  sourceImageIds: sources
    .map((source) => source.libraryId)
    .filter((id): id is string => Boolean(id))
});
```

`buildEditPrompt()` should make intent explicit:

```ts
function buildEditPrompt(prompt: string, sourceCount: number): string {
  const base = prompt.trim();
  if (sourceCount <= 1) {
    return `Edit the provided image according to these instructions:\n\n${base}`;
  }
  return `Edit the primary image according to these instructions, using the additional images as visual references when helpful:\n\n${base}`;
}
```

### App Navigation

In `AppShell.tsx`:

- Add `edit` to `TabKey`.
- Import `EditView`.
- Add a sidebar tab with an appropriate Fluent icon.
- Render `{tab === 'edit' ? <EditView /> : null}`.

Recommended tab order:

1. Generate
2. Edit
3. Fusion
4. Scene
5. Prompt Mixer
6. Library
7. Settings

## Change 2: Right-Click Copy Generated Images

### Files To Update

- `Src/src/components/ImagePreview.tsx`
- `Src/shared/ipc.ts`
- `Src/shared/types.ts`
- `Src/electron/preload.ts`
- `Src/electron/ipc/imageGenerationHandlers.ts`
- `Src/src/services/imageApi.ts`
- Optional: `Src/src/features/library/LibraryView.tsx` for library preview copy support.

### Why Use Electron Clipboard IPC

Use Electron main-process clipboard support instead of browser `navigator.clipboard.write()`.

Reason: image clipboard support in Chromium can be inconsistent across desktop targets and permissions. Electron's `clipboard.writeImage(nativeImage.createFromDataURL(...))` is the most reliable path for copying generated PNGs so they paste into chat apps.

### Shared Types

Add a copy result type in `Src/shared/types.ts`:

```ts
export interface CopyImageResult {
  success: boolean;
  error?: string;
}
```

Extend `ImageMixApi`:

```ts
copyImage(dataUrl: string): Promise<CopyImageResult>;
```

### IPC Channel

Add to `IpcChannels` in `Src/shared/ipc.ts`:

```ts
copyImage: 'imagemix:copy-image'
```

### Preload Bridge

In `Src/electron/preload.ts`, add:

```ts
copyImage: (dataUrl: string): Promise<CopyImageResult> =>
  ipcRenderer.invoke(IpcChannels.copyImage, dataUrl)
```

### Main Process Handler

In `Src/electron/ipc/imageGenerationHandlers.ts`:

- Import `clipboard` and `nativeImage` from `electron`.
- Register `IpcChannels.copyImage`.
- Validate the incoming data URL.
- Convert to `nativeImage`.
- Reject empty images.
- Write to clipboard.

Suggested handler:

```ts
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
```

### Renderer API Wrapper

Add to `Src/src/services/imageApi.ts`:

```ts
copyImage: (dataUrl: string): Promise<CopyImageResult> =>
  api().copyImage(dataUrl)
```

### ImagePreview UX

Update `ImagePreview` so every generated result image supports copying:

- Add `onCopyImage?: (dataUrl: string) => Promise<void> | void` prop, or call `imageApi.copyImage` directly inside the component.
- Prefer calling `imageApi.copyImage` inside `ImagePreview` because this is global behavior for all result previews.
- Add `onContextMenu` to the `<img>` element.
- Prevent default browser context menu.
- Copy the image via `imageApi.copyImage(imageUrl)`.
- Show a small success/error `MessageBar` under the preview actions.
- Add a visible secondary `Copy` button as a discoverable fallback; the requirement is right-click copy, but a button helps users who do not know the right-click behavior.

Recommended implementation details:

```tsx
const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
const [copyError, setCopyError] = useState<string | null>(null);

const copyImage = async () => {
  if (!imageUrl) return;
  const result = await imageApi.copyImage(imageUrl);
  if (result.success) {
    setCopyStatus('copied');
    setCopyError(null);
  } else {
    setCopyStatus('error');
    setCopyError(result.error ?? 'Copy failed.');
  }
};
```

Then:

```tsx
<img
  className={styles.image}
  src={imageUrl}
  alt="Generated result"
  onContextMenu={(event) => {
    event.preventDefault();
    void copyImage();
  }}
/>
```

### Library Preview Optional Enhancement

The request says every screen after generating image, which is covered by `ImagePreview`. For consistency, add the same right-click copy behavior to the image in `LibraryView` preview dialog. This reuses `imageApi.copyImage(preview.dataUrl)`.

## Change 3: Scene Continuation / Next Image Screen

### Files To Add

- `Src/src/features/scene/SceneView.tsx`

### Files To Update

- `Src/src/components/AppShell.tsx`
- `Src/shared/types.ts`
- `Src/electron/openaiClient.ts`
- Optional: `Src/src/features/library/LibraryView.tsx` if adding `Use as scene source` from the library.

### Scene View UI

Create a dedicated screen named `Scene`.

Left card controls:

- Title: `Scene`
- `ImageDropzone` for one starting image.
- `ImageThumbnailList` or a compact single-image preview for selected source image.
- `PromptInput` label: `What happens next?`
- Placeholder: `The person turns toward the window as rain starts falling outside`
- Seconds input using Fluent `Input` or `SpinButton` pattern:
  - Label: `Seconds later`
  - Numeric value.
  - Minimum: `1`
  - Maximum: `60` to keep prompts realistic.
  - Default: `8`.
- Optional enhance button:
  - Button text: `Enhance description`.
  - Disabled unless image and description exist.
- `ModelSelector` for image generation.
- `SizeSelector`.
- Primary button text: `Next Image`.

Right side:

- Shared `ImagePreview`.
- Empty hint: `Select a starting image and describe what changes after the selected seconds.`

### Scene Source State

Use local state, not global Fusion selection:

```ts
interface SceneSource {
  id: string;
  name: string;
  dataUrl: string;
  libraryId?: string;
}
```

Allow only one primary source image for the first version.

If the user drops multiple images, keep the first image and show a warning that Scene uses one starting image.

Reason: the requested workflow says `User select an image`. Keeping one primary image makes the generated next frame more predictable.

### Build Scene Prompt

Add helper inside `SceneView.tsx`:

```ts
function buildScenePrompt(description: string, seconds: number): string {
  return [
    'Create the next still image/frame from the provided starting image.',
    `Show the scene exactly ${seconds} seconds after the described action has happened.`,
    'Preserve identity, composition continuity, lighting direction, camera angle, and environment unless the description requires a change.',
    'Do not create a video, storyboard, text overlay, frame border, or multiple panels.',
    `Action/description: ${description.trim()}`
  ].join('\n');
}
```

### Scene Generate Request

Validation:

- Require one selected image.
- Require non-empty description.
- Require seconds between 1 and 60.
- Disable while busy.

Generate request:

```ts
await generate({
  mode: 'scene-next-image',
  prompt: buildScenePrompt(description, seconds),
  model,
  size,
  images: [{ data: source.dataUrl, name: source.name }],
  sourceImageIds: source.libraryId ? [source.libraryId] : undefined
});
```

This uses the existing `images.edit(...)` backend path because a source image is provided.

### Scene Prompt Enhancement

Use `imageApi.improvePrompt(...)` with the multimodal `items` shape added in Change 1.

Request:

```ts
const result = await imageApi.improvePrompt({
  model: 'gpt-5.5',
  instruction: [
    'Enhance this scene-continuation description for an image generation model.',
    `The generated image must show the same scene ${seconds} seconds later.`,
    'Keep the prompt concise, visual, and continuity-focused.',
    'Return only the enhanced prompt text.'
  ].join(' '),
  items: [
    {
      type: 'text',
      text: description.trim(),
      weightPercent: 50
    },
    {
      type: 'image',
      data: source.dataUrl,
      name: source.name,
      weightPercent: 50
    }
  ]
});
```

On success, replace the description field with `result.prompt`.

### Backend Prompt Improvement Adjustment

`electron/openaiClient.ts` already supports multimodal `items`, but its default instruction is currently oriented toward weighted prompt mixing.

For Scene, always pass an explicit `instruction` from `SceneView`, so no backend change is strictly required.

Small backend improvement recommended:

- Include image names and weights in the multimodal prompt text for each image item.
- This helps the model understand which image was provided.

Example adjustment:

```ts
content.push({
  type: 'text',
  text: `Image: ${item.name}. Weight: ${item.weightPercent}%`
});
```

## Reusable Helper Opportunities

These are optional but would make implementation cleaner:

### `SourceList` Helper

If Edit and Scene both need non-weighted source thumbnails, create a small wrapper component:

- `Src/src/components/SourceImageList.tsx`
- Props: `images`, `onRemove`, `onMove?`, `disabled?`
- Internally similar to `ImageThumbnailList` without weight controls.

This avoids passing fake `weightPercent` values to `ImageThumbnailList`.

### `copyImageToClipboard` Hook

If `ImagePreview` and `LibraryView` both need copy status UI, create:

- `Src/src/hooks/useCopyImage.ts`

Return:

```ts
{
  copyImage(dataUrl: string): Promise<void>;
  copyStatus: 'idle' | 'copied' | 'error';
  copyError: string | null;
  resetCopyStatus(): void;
}
```

Keep this only if Library preview copy is implemented too; otherwise keep copy logic inside `ImagePreview`.

## Validation Plan

Run after implementation:

```powershell
Push-Location Src; npm run typecheck; npm run build:renderer; Pop-Location
```

Manual smoke tests:

1. Generate screen:
   - Generate an image.
   - Right-click result image.
   - Paste into a chat/input that accepts images.
   - Confirm the copied image is pasted.
2. Edit screen:
   - Drop one image.
   - Enter edit instructions.
   - Click `Edit image`.
   - Confirm a new library image is saved and previewed.
   - Export still works.
   - Right-click copy works on the edited result.
3. Edit screen with multiple images:
   - Drop two images.
   - Prompt should treat first image as primary and additional images as references.
4. Scene screen:
   - Drop/select one image.
   - Enter description and set seconds to `8`.
   - Click `Enhance description`.
   - Confirm enhanced text replaces the field.
   - Click `Next Image`.
   - Confirm result represents the same scene after 8 seconds.
5. Validation states:
   - Edit button disabled with no image or no prompt.
   - Scene `Next Image` disabled with no image, no description, or invalid seconds.
   - Prompt enhancement disabled until required inputs exist.

## Expected Commit Scope

Implementation should include these files at minimum:

- `Plan/change2.md`
- `Src/shared/types.ts`
- `Src/shared/ipc.ts`
- `Src/electron/preload.ts`
- `Src/electron/ipc/imageGenerationHandlers.ts`
- `Src/electron/openaiClient.ts`
- `Src/src/services/imageApi.ts`
- `Src/src/components/AppShell.tsx`
- `Src/src/components/ImagePreview.tsx`
- `Src/src/features/edit/EditView.tsx`
- `Src/src/features/scene/SceneView.tsx`

Optional depending on final UX polish:

- `Src/src/features/library/LibraryView.tsx`
- `Src/src/components/SourceImageList.tsx`
- `Src/src/hooks/useCopyImage.ts`

## Notes And Constraints

- The Scene feature generates a still image that represents the requested future moment. It does not generate a video.
- OpenAI image edit does not guarantee exact temporal physics, so the prompt must clearly describe continuity, time delta, and the desired final state.
- Right-click copy should copy the actual image bytes, not the image URL text.
- Keep all new generated-result previews on `ImagePreview` so copy/export behavior stays consistent across screens.