# Change 4 Implementation Plan

## Goals

1. Add a new `Video Scene` screen that creates three copyable video prompts from a start frame, an end frame, and user-selected motion options.
2. Add a handoff from the existing `Scene` screen: after generating the next image, show `Generate Video Prompt?`; clicking it opens `Video Scene` with the original scene image as the start frame and the generated image as the end frame.
3. Fix the Library screen so image actions such as preview, use as fusion source, export, and delete are consistently visible and not visually hidden by the image.

## Current App Fit

- Navigation is controlled locally in `Src/src/components/AppShell.tsx` with a `TabKey` union and conditional screen rendering.
- Scene generation lives in `Src/src/features/scene/SceneView.tsx`. It already tracks the selected scene image (`sceneSource`) and the latest generated image preview URL (`resultUrl`) plus `lastId`.
- Prompt improvement already exists through `imageApi.improvePrompt()` and supports multimodal inputs via text and image items.
- Library rendering lives in `Src/src/features/library/LibraryView.tsx`. Actions currently appear as small subtle icon buttons after the image/meta content, which can become visually unclear across different card/image sizes.

## Data Model and Types

### Add renderer-local types for Video Scene

Create `Src/src/features/videoScene/videoSceneTypes.ts` with:

- `VideoSceneImageSource`
  - `id: string`
  - `name: string`
  - `dataUrl: string`
  - `libraryId?: string`
- `EnvironmentChangeLevel = 'low' | 'medium' | 'high'`
- `CameraPositionOption`
  - `id: string`
  - `label: string`
  - `description: string`
  - `isCustom?: boolean`
- `VideoSceneDraft`
  - `startImage?: VideoSceneImageSource`
  - `endImage?: VideoSceneImageSource`
- `VideoPromptSet`
  - `short: string`
  - `medium: string`
  - `large: string`

Keep these renderer-local unless another main-process API needs them. The first version can use existing `ImprovePromptRequest`/`ImprovePromptResult` without changing preload IPC.

## Video Scene Screen

### New file

Create `Src/src/features/videoScene/VideoSceneView.tsx`.

### Layout

Use the same two-column workbench style as Scene/Fusion where practical:

- Left controls column:
  - `Title3` with `Video Scene`
  - Start frame dropzone
  - Start frame thumbnail
  - End frame dropzone
  - End frame thumbnail
  - Camera Position Change selector
  - Add custom camera style control
  - Suggest camera position button
  - Sound checkbox
  - Sound detail field shown when sound is enabled
  - Main action prompt input
  - Environment change segmented/radio control: Low, Medium, High
  - Generate Scenes button
  - Error/warning messages
- Right output column:
  - Three prompt result sections: Short Prompt, Medium Prompt, Large Prompt
  - Each section has a read-only text area and Copy button
  - Per-prompt copied state feedback

Avoid a landing page. The first screen should be the usable Video Scene tool.

### Image inputs

- Reuse `ImageDropzone` and `ImageThumbnailList`.
- Each frame accepts only one image.
- If multiple images are dropped, select the first and show a warning.
- Start frame label: `Start frame`.
- End frame label: `End frame`.
- Start/end thumbnail lists should pass `weightPercent: 0`, matching current `ImageThumbnailList` requirements.

### Camera position options

Create a default option list in `VideoSceneView.tsx` or a small helper file such as `videoSceneOptions.ts`.

Initial options:

- `None / hold start camera`: camera remains like the start frame.
- `Slow push in`: camera gradually moves closer.
- `Slow pull back`: camera gradually reveals more of the scene.
- `Pan left`: camera turns or slides left.
- `Pan right`: camera turns or slides right.
- `Tilt up`: camera tilts upward.
- `Tilt down`: camera tilts downward.
- `Orbit left`: camera arcs around the subject to the left.
- `Orbit right`: camera arcs around the subject to the right.
- `Tracking forward`: camera follows the subject forward.
- `Tracking backward`: camera retreats while tracking the subject.
- `Handheld subtle`: slight natural handheld motion.
- `Crane up`: camera rises vertically.
- `Crane down`: camera descends vertically.
- `Dolly zoom`: background scale shifts while subject framing changes.
- `Locked tripod`: no camera movement except natural scene motion.

Use a `Dropdown` or `Combobox` from Fluent UI. `None / hold start camera` should be selectable and should explicitly tell the prompt generator to preserve the start-frame camera.

### Add custom camera style

Implement a compact custom-camera workflow:

- A button or inline field labelled `Add camera style`.
- User enters a name and description.
- On add, append to the local options list and select it.
- Store custom options in `localStorage` under a stable key such as `imagemix.videoScene.customCameraOptions` so they survive app restarts.
- Validate that a custom style has a non-empty name and description.
- Prevent duplicate names case-insensitively.

### Suggest camera position

Add a `Suggest` button beside the camera selector.

Behavior:

- Enabled only when both start and end images are present and not already suggesting/generating.
- Calls `imageApi.improvePrompt()` with model `gpt-5.5`.
- Request uses multimodal `items`:
  - Text item: list all available camera options and ask for the single best option id/label based on the visual transition from Image 1 to Image 2.
  - Image item: start frame named `Image 1 start frame - {name}`.
  - Image item: end frame named `Image 2 end frame - {name}`.
- Instruction should require a strict response format, for example:
  - First line: `Camera: <exact option label>`
  - Optional second line: one short reason.
- Match the returned label to an available option. If no exact match, show the returned text in an error/warning and do not change selection.
- When matched, select that camera option and optionally show the short reason below the selector.

### Sound option

- Add a checkbox: `Enable sound`.
- When enabled, show a prompt input labelled `Sound detail`.
- Placeholder: `Low thunder, distant alarms, footsteps on wet concrete`.
- The generated prompts should include sound direction only when enabled.
- If enabled and the sound field is empty, the prompt generator should infer fitting sound from the images and main action.

### Main action

- Add `PromptInput` labelled `Main action`.
- Keep this intentionally short; placeholder: `The creature rises from the water and turns toward the city`.
- This is required before generating prompts.

### Environment change

- Use a small option control for `Low`, `Medium`, `High`.
- Prompt meaning:
  - `Low`: keep most environment details stable; only subtle lighting, atmosphere, or object motion changes.
  - `Medium`: allow clear but believable changes in environment, weather, props, crowd, light, or damage.
  - `High`: allow major environmental transformation while keeping continuity between start/end frames.

### Generate Scenes behavior

Button label: `Generate Scenes`.

Enabled when:

- Start frame exists.
- End frame exists.
- Main action is non-empty.
- Not currently generating/suggesting.

Implementation:

- Call `imageApi.improvePrompt()` rather than image generation.
- Use the start/end images as multimodal inputs.
- Include camera option, sound state/detail, main action, environment change level, and required output structure.
- Require a strict parseable result. Recommended format:

```text
SHORT:
<short prompt>

MEDIUM:
<medium prompt>

LARGE:
<long prompt>
```

- Parse the response by those labels into a `VideoPromptSet`.
- If parsing fails, show an error and optionally keep the raw response in the Large field only as a fallback.

Prompt generation instruction should include:

- The output is for a video generation model.
- Image 1 is the start frame.
- Image 2 is the end frame.
- Preserve subject identity and world continuity between frames.
- The prompt must describe motion from Image 1 to Image 2.
- Camera movement must follow the selected camera option.
- If camera option is `None / hold start camera`, keep camera/framing like Image 1.
- Environment change should follow selected level.
- If sound is enabled, include fitting audio/sound direction.
- Return only the three labelled prompts.

### Copy behavior

- Use `navigator.clipboard.writeText()` in the renderer for prompt text copying.
- Each prompt section has a copy icon/button and local copied status.
- Disable copy buttons when that prompt is empty.
- Keep generated prompt text selectable.

## Scene to Video Scene Handoff

### AppShell state

Modify `Src/src/components/AppShell.tsx`:

- Add tab key `videoScene`.
- Add `Video Scene` tab in the sidebar, likely after `Scene`.
- Add state:
  - `const [videoSceneDraft, setVideoSceneDraft] = useState<VideoSceneDraft | null>(null);`
- Render `<VideoSceneView draft={videoSceneDraft} onDraftConsumed={() => setVideoSceneDraft(null)} />`.
- Add callback passed into Scene:
  - `onCreateVideoPrompt={(draft) => { setVideoSceneDraft(draft); setTab('videoScene'); }}`.

### SceneView props

Modify `Src/src/features/scene/SceneView.tsx`:

- Add props interface:
  - `onCreateVideoPrompt?: (draft: VideoSceneDraft) => void;`
- Track the generated image data needed for handoff:
  - Existing `resultUrl` can serve as the end frame data URL.
  - Existing `sceneSource` is the start frame.
  - Existing `lastId` can become `libraryId` for the end image if needed.
- After a successful scene generation where `resultUrl` exists and `sceneSource` exists, show a secondary button below/near `ImagePreview` or under `Next Image`:
  - Label: `Generate Video Prompt?`
  - Icon: `VideoClip20Regular` if available.
- On click, call `onCreateVideoPrompt` with:
  - `startImage`: the current `sceneSource` (image 2 / scene image, not the consistent character reference).
  - `endImage`: `{ id: lastId ?? 'generated-scene-end', name: 'Generated scene end frame', dataUrl: resultUrl, libraryId: lastId ?? undefined }`.
- This button should not appear before a generated image exists.
- If consistent character mode is enabled, do not use `characterSource` for this handoff.

### Draft consumption in VideoSceneView

In `VideoSceneView`:

- If `draft` changes and contains images, prefill start/end frame state.
- Call `onDraftConsumed` after applying the draft so refreshing/re-rendering does not repeatedly overwrite user edits.
- Preserve user edits if no new draft is provided.

## Library Screen Visibility Fix

Modify `Src/src/features/library/LibraryView.tsx`.

Recommended approach:

- Keep image actions always visible in a dedicated action strip with stable height.
- Place the action strip directly under the thumbnail and before prompt metadata, or use a high-contrast overlay at the bottom of the thumbnail with a solid/semi-solid neutral background.
- Prefer not relying on hover-only visibility.
- Use fixed button dimensions so icons do not collapse or shift.
- Keep tooltips for icon-only buttons.
- Ensure every card has enough vertical layout space and actions cannot be covered by images:
  - `card`: set `minWidth: 0`, `overflow: 'hidden'`.
  - `thumb`: keep fixed height and `flexShrink: 0`.
  - `actions`: set `display: 'grid'` or `display: 'flex'`, `minHeight`, `flexShrink: 0`, and a visible background/border if needed.
  - Button style: fixed square size such as `32px` and `appearance="secondary"` or consistent subtle appearance with stronger contrast.
- Consider adding accessible labels/tooltips that match user-visible meaning:
  - Preview/View
  - Use as fusion source
  - Export
  - Delete

Acceptance for the Library fix:

- All image cards show all action buttons without requiring hover.
- Buttons do not overlap the image, prompt text, or timestamp.
- Actions remain visible for portrait, landscape, and square images.
- The grid still scrolls normally.

## Files To Create

- `Src/src/features/videoScene/VideoSceneView.tsx`
- Optional: `Src/src/features/videoScene/videoSceneTypes.ts`
- Optional: `Src/src/features/videoScene/videoSceneOptions.ts`

## Files To Modify

- `Src/src/components/AppShell.tsx`
  - Add `videoScene` tab, state, and Scene handoff callback.
- `Src/src/features/scene/SceneView.tsx`
  - Add `Generate Video Prompt?` button after successful scene generation.
  - Pass selected scene image as start frame and generated result as end frame.
- `Src/src/features/library/LibraryView.tsx`
  - Fix card/action layout visibility.
- Optional shared changes only if needed:
  - `Src/shared/types.ts` if `VideoSceneDraft` is shared more broadly. Prefer renderer-local first.

## Implementation Order

1. Create Video Scene types/options.
2. Build `VideoSceneView` with start/end image inputs, camera selection, custom camera option storage, sound, main action, environment level, generate prompt action, parsing, and copy controls.
3. Wire `VideoSceneView` into `AppShell` as a new tab.
4. Add Scene-to-Video handoff from `SceneView` after scene image generation.
5. Fix Library action visibility.
6. Run validation.

## Validation Plan

Run from `Src/`:

```powershell
npm run typecheck
npm run build:renderer
```

Manual checks:

1. Open Video Scene directly from the sidebar.
2. Drop one start frame and one end frame.
3. Select `None / hold start camera`, enter a main action, generate prompts, and verify three labelled prompts appear.
4. Enable sound with empty sound detail and confirm generated prompts include inferred sound direction.
5. Enable sound with custom sound detail and confirm it is reflected.
6. Add a custom camera style, refresh/restart app, and confirm it persists.
7. Use Suggest after loading two images and confirm it selects one available camera option or shows a clear warning.
8. In Scene, generate a next image, click `Generate Video Prompt?`, and confirm Video Scene opens with start/end frames prefilled.
9. In consistent-character mode, confirm Scene handoff uses the scene image as the start frame and not the character reference.
10. Open Library with mixed image sizes and confirm Preview, Use as Fusion Source, Export, and Delete are always visible and clickable.

## Risks and Notes

- The prompt generation response must be parsed reliably. Strict labels (`SHORT`, `MEDIUM`, `LARGE`) reduce risk, but the UI should handle malformed responses gracefully.
- Suggest camera position depends on the model returning an exact option label. The prompt should include labels exactly and ask for one exact label.
- Clipboard copying for text prompts can use browser clipboard APIs in the renderer; no Electron IPC is needed unless clipboard permission problems appear.
- No actual video rendering is required in this change. The feature generates prompts for external video generation tools.
