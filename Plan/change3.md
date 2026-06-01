# Change 3 Implementation Plan

Source request: [new Change3.md](new%20Change3.md)

## Goal

Update the Scene screen so it can optionally use a separate consistent-character reference image.

When the option is enabled, the user provides:

1. Image 1: a consistent character/monster/reference image.
2. A text description explaining what should stay consistent, for example: `Based on this leviathan as consistent monster through all image`.
3. Image 2: the normal scene starting image.
4. The existing scene description and seconds value.

When the option is disabled, the Scene screen must behave exactly like it does now.

## Existing Source Facts

- Scene screen is implemented in `Src/src/features/scene/SceneView.tsx`.
- Scene currently stores one local `source` image and sends it to `generate({ mode: 'scene-next-image', images: [...] })`.
- The backend already uses `openai.images.edit(...)` whenever `GenerationRequest.images` has one or more source images.
- Scene prompt enhancement already calls `imageApi.improvePrompt(...)` with multimodal `items` containing text and image data.
- `ImageDropzone` supports selecting/dropping multiple files, but Scene currently keeps only the first image.
- `ImageThumbnailList` can show selected image thumbnails without weights by passing a `weightPercent: 0` value and leaving `showWeights` unset.

## User Experience

### Default Flow

If `Enable consistent character` is unchecked:

- Show the current Scene UI.
- Require only the existing starting image, scene description, valid seconds, model, and size.
- Enhancement and generation should behave as they do today.
- Generated prompt should not mention a character reference image.

### Consistent Character Flow

If `Enable consistent character` is checked:

- Show an additional section before the current starting-image section.
- Section label: `Consistent character`.
- Include a checkbox labeled `Enable consistent character`.
- Once checked, show:
  - An `ImageDropzone` for Image 1, the character/reference image.
  - A thumbnail for the selected character image.
  - A `PromptInput` or `Field` + `Textarea` for the character consistency instruction.
  - Placeholder: `Use this leviathan as the same consistent monster across every generated image`.
- Keep the current starting image section as Image 2.
- Rename the current section label from `Starting image` to `Scene image` when consistent-character mode is enabled.
- Generate should send both images to the image edit API:
  - Image 1 first: consistent character reference.
  - Image 2 second: scene starting image.
- Prompt enhancement must explicitly say to use the character from Image 1 as the consistent character/reference.

## Files To Update

- `Src/src/features/scene/SceneView.tsx`

No shared type or backend changes are required for the core feature because `GenerationRequest.images` already accepts multiple `SourceImage` entries and the backend already uses `images.edit(...)` for requests with images.

## Scene State Changes

Add local state to `SceneView`:

```ts
const [consistentCharacterEnabled, setConsistentCharacterEnabled] =
  useState(false);
const [characterSource, setCharacterSource] = useState<SceneSource | null>(null);
const [characterDescription, setCharacterDescription] = useState('');
const [characterFileErrors, setCharacterFileErrors] = useState<string[]>([]);
const [characterMultiWarning, setCharacterMultiWarning] = useState(false);
```

Keep existing state:

```ts
const [source, setSource] = useState<SceneSource | null>(null);
const [description, setDescription] = useState('');
const [seconds, setSeconds] = useState(8);
```

Consider renaming `source` to `sceneSource` while editing for clarity:

```ts
const [sceneSource, setSceneSource] = useState<SceneSource | null>(null);
```

This rename is optional but recommended because there will be two images in the same component.

## Imports

Update Fluent imports in `SceneView.tsx`:

```ts
import {
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Subtitle2,
  Title3,
  makeStyles,
  tokens
} from '@fluentui/react-components';
```

No new icon is required.

## Prompt Building

Replace the current `buildScenePrompt(description, seconds)` with a function that accepts an optional character reference:

```ts
interface CharacterReference {
  imageName: string;
  description: string;
}

function buildScenePrompt(
  description: string,
  seconds: number,
  character?: CharacterReference
): string {
  const parts = [
    'Create the next still image/frame from the provided scene image.',
    `Show the scene exactly ${seconds} seconds after the described action has happened.`,
    'Preserve identity, composition continuity, lighting direction, camera angle, and environment unless the description requires a change.',
    'Do not create a video, storyboard, text overlay, frame border, or multiple panels.'
  ];

  if (character) {
    parts.push(
      `Use Image 1 (${character.imageName}) as the consistent character reference.`,
      `Character consistency instruction: ${character.description.trim()}`,
      'If the scene description includes this character, keep the same identity, creature design, silhouette, materials, proportions, and recognizable visual details from Image 1.',
      'Image 2 is the scene/start frame to continue from.'
    );
  }

  parts.push(`Action/description: ${description.trim()}`);
  return parts.join('\n');
}
```

When consistent-character mode is disabled, call it without the third argument.

When enabled, pass:

```ts
{
  imageName: characterSource.name,
  description: characterDescription
}
```

## Image Selection Behavior

### Character Image Dropzone

The character dropzone should keep only the first selected image, like the current Scene image dropzone:

```tsx
<ImageDropzone
  disabled={busy}
  onImages={(images) => {
    if (images.length === 0) return;
    const [first] = images;
    setCharacterMultiWarning(images.length > 1);
    setCharacterSource({
      id: first.id,
      name: first.name,
      dataUrl: first.dataUrl
    });
  }}
  onErrors={setCharacterFileErrors}
/>
```

Warnings:

- If more than one image is selected: `Consistent character uses one reference image. The first image was selected.`
- File errors should appear in the character section, not mixed with scene-image errors.

### Scene Image Dropzone

Keep current behavior. If `source` is renamed to `sceneSource`, update all usages consistently.

Warnings:

- Existing multi-image warning can remain: `Scene uses one starting image. The first image was selected.`

## Validation Rules

### Existing Mode

When `consistentCharacterEnabled === false`, keep current validation:

```ts
const canEnhance =
  !improving && !busy && Boolean(sceneSource) && description.trim().length > 0;

const canGenerate =
  !busy &&
  Boolean(sceneSource) &&
  description.trim().length > 0 &&
  secondsValid;
```

### Consistent Character Mode

When `consistentCharacterEnabled === true`, additionally require:

- Character image selected.
- Character description not empty.

Suggested helpers:

```ts
const characterReady =
  !consistentCharacterEnabled ||
  (Boolean(characterSource) && characterDescription.trim().length > 0);

const canEnhance =
  !improving &&
  !busy &&
  Boolean(sceneSource) &&
  description.trim().length > 0 &&
  characterReady;

const canGenerate =
  !busy &&
  Boolean(sceneSource) &&
  description.trim().length > 0 &&
  secondsValid &&
  characterReady;
```

If consistent-character mode is enabled but incomplete, show a warning near the checkbox section:

```tsx
{consistentCharacterEnabled && !characterReady ? (
  <MessageBar intent="warning">
    <MessageBarBody>
      Add a consistent character image and description before enhancing or generating.
    </MessageBarBody>
  </MessageBar>
) : null}
```

## Enhance Description Request

Update `onEnhance()` so it builds a different multimodal payload when consistent-character mode is enabled.

### Existing Mode Payload

Keep the current one-image behavior:

```ts
items: [
  { type: 'text', text: description.trim(), weightPercent: 50 },
  { type: 'image', data: sceneSource.dataUrl, name: sceneSource.name, weightPercent: 50 }
]
```

### Consistent Character Payload

When enabled, use two image items and include the character instruction as text:

```ts
items: [
  {
    type: 'text',
    text: [
      `Scene action after ${seconds} seconds: ${description.trim()}`,
      `Consistent character instruction: ${characterDescription.trim()}`,
      'Image 1 is the consistent character reference.',
      'Image 2 is the scene/start frame.'
    ].join('\n'),
    weightPercent: 34
  },
  {
    type: 'image',
    data: characterSource.dataUrl,
    name: `Image 1 consistent character - ${characterSource.name}`,
    weightPercent: 33
  },
  {
    type: 'image',
    data: sceneSource.dataUrl,
    name: `Image 2 scene frame - ${sceneSource.name}`,
    weightPercent: 33
  }
]
```

Use an explicit instruction:

```ts
instruction: [
  'Enhance this scene-continuation description for an image generation model.',
  `The generated image must show the scene ${seconds} seconds later.`,
  consistentCharacterEnabled
    ? 'Use Image 1 as the consistent character reference and explicitly preserve that character when it appears in the scene.'
    : 'Use the provided image as the starting scene frame.',
  'Keep the prompt concise, visual, and continuity-focused.',
  'Return only the enhanced prompt text.'
].join(' ')
```

On success, keep the existing behavior: replace the scene `description` with `result.prompt`.

Do not overwrite `characterDescription`; it should remain the stable character reference instruction.

## Generate Request

Update `onGenerate()` to send either one image or two images.

### Existing Mode

Keep current request:

```ts
images: [{ data: sceneSource.dataUrl, name: sceneSource.name }]
```

### Consistent Character Mode

Send character image first and scene image second:

```ts
const images = consistentCharacterEnabled && characterSource
  ? [
      {
        data: characterSource.dataUrl,
        name: `image-1-consistent-character-${characterSource.name}`
      },
      {
        data: sceneSource.dataUrl,
        name: `image-2-scene-${sceneSource.name}`
      }
    ]
  : [{ data: sceneSource.dataUrl, name: sceneSource.name }];
```

Prompt:

```ts
const prompt = buildScenePrompt(
  description,
  seconds,
  consistentCharacterEnabled && characterSource
    ? {
        imageName: characterSource.name,
        description: characterDescription
      }
    : undefined
);
```

Request:

```ts
await generate({
  mode: 'scene-next-image',
  prompt,
  model,
  size,
  images,
  sourceImageIds: sceneSource.libraryId ? [sceneSource.libraryId] : undefined
});
```

If later library-source support is added for character references, include both library IDs when available. For now, drag/drop sources do not have library IDs.

## JSX Layout Plan

Inside the controls card, update the top of the screen to this order:

1. `Title3` Scene
2. `Checkbox` Enable consistent character
3. If enabled:
   - `Subtitle2` Consistent character
   - Character `ImageDropzone`
   - Character file/multi warnings
   - Character thumbnail using `ImageThumbnailList`
   - `PromptInput` label `Consistent character description`
4. `Subtitle2` label:
   - `Scene image` if consistent-character mode is enabled
   - `Starting image` if disabled
5. Existing scene image `ImageDropzone`
6. Existing scene image warnings and thumbnail
7. Existing `What happens next?`, seconds, enhance, model/size, and `Next Image`

Checkbox example:

```tsx
<Checkbox
  checked={consistentCharacterEnabled}
  disabled={busy || improving}
  label="Enable consistent character"
  onChange={(_, data) =>
    setConsistentCharacterEnabled(Boolean(data.checked))
  }
/>
```

Do not clear `characterSource` or `characterDescription` automatically when disabling the checkbox. Keeping them in state lets users toggle the option back on without reselecting the image.

## Edge Cases

- If consistent-character mode is enabled, the Scene screen should not enhance or generate until both Image 1 and the character description exist.
- If the scene description does not mention the character, prompt text should still preserve the option that Image 1 is the consistent character reference for when the scene includes it.
- If Image 2 already includes the character, the prompt should preserve the character identity from Image 1, not reinterpret it from Image 2.
- If Image 2 does not include the character, the generated frame may include or omit the character based on the scene description, but any included character should match Image 1.
- The feature produces one still image, not a video.

## Validation Plan

Run after implementation:

```powershell
Push-Location Src; npm run typecheck; npm run build:renderer; Pop-Location
```

Manual smoke tests:

1. Existing Scene behavior:
   - Leave `Enable consistent character` unchecked.
   - Select one starting image.
   - Enter description and seconds.
   - Enhance and generate.
   - Confirm behavior matches the current Scene flow.
2. Consistent character validation:
   - Enable checkbox without selecting character image.
   - Confirm `Enhance description` and `Next Image` are disabled.
   - Add character image but no character description.
   - Confirm buttons remain disabled.
   - Add character description.
   - Confirm buttons become enabled once scene image, scene description, and valid seconds are present.
3. Consistent character enhancement:
   - Use Image 1 as a character/monster reference.
   - Use Image 2 as the scene.
   - Click `Enhance description`.
   - Confirm enhanced text explicitly references preserving/using the consistent character from Image 1.
4. Consistent character generation:
   - Generate with Image 1 and Image 2.
   - Confirm the generated result uses Image 2 as the continued scene and preserves Image 1's character identity when the character appears.
5. Toggle persistence:
   - Enable, select character image and description.
   - Disable and re-enable.
   - Confirm selected character data remains available.

## Expected Commit Scope

Minimum implementation files:

- `Plan/change3.md`
- `Src/src/features/scene/SceneView.tsx`

No IPC, preload, shared type, or OpenAI client changes are required unless the implementation chooses to add reusable helpers or library-source shortcuts.