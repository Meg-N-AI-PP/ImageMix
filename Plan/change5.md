# Change 5 Implementation Plan

## Goal

Add two required Video Scene controls:

1. `Camera angle` dropdown.
2. `Camera perspective` dropdown.

Both selections must be included anywhere the Video Scene feature builds or improves video prompts, so generated Short, Medium, and Large prompts all account for the chosen angle and perspective in addition to the existing camera position change, sound, main action, environment change, and duration behavior.

## Current Source Code Fit

- The Video Scene screen is implemented in `Src/src/features/videoScene/VideoSceneView.tsx`.
- Static Video Scene option data currently lives in `Src/src/features/videoScene/videoSceneOptions.ts`.
- Video Scene types live in `Src/src/features/videoScene/videoSceneTypes.ts`.
- The screen already has a `Camera Position Change` dropdown backed by `CameraPositionOption` and `defaultCameraOptions`.
- Generated prompts are created by `generatePrompts()` in `VideoSceneView.tsx`, which calls `imageApi.improvePrompt()` with:
	- a text instruction from `buildVideoPromptInstruction()`
	- a text context item
	- start frame image item
	- end frame image item
- Camera suggestion is handled separately by `suggestCamera()` and should remain focused on camera movement/position unless the UX is intentionally expanded later.
- Scene-to-Video handoff already opens Video Scene with start and end frames only; it does not need to pass angle or perspective because those are user choices inside Video Scene.

## Option Values

### Camera angle dropdown values

Add these values exactly as selectable labels:

- `Eye-Level Angle`
- `High Angle`
- `Low Angle`
- `Overhead Angle`
- `Worm's-Eye View`
- `Dutch Angle`
- `Ground-Level Angle`
- `Shoulder-Level Angle`
- `Hip-Level Angle`
- `Knee-Level Angle`
- `Aerial Angle`
- `Top-Down Angle`

### Camera perspective dropdown values

Add these values exactly as selectable labels:

- `First-Person POV`
- `Third-Person View`
- `Over-the-Shoulder View`
- `Objective View`
- `Subjective POV`
- `CCTV / Surveillance View`
- `Handheld View`
- `Found-Footage View`
- `Aerial / Drone View`
- `Top-Down View`
- `Side View / Profile View`
- `Isometric View`

## Data Model and Option Types

### Update `videoSceneTypes.ts`

Add a small reusable type for fixed camera guidance options:

```ts
export interface CameraGuidanceOption {
	id: string;
	label: string;
	description: string;
}
```

Use this for both angle and perspective options. Keep `CameraPositionOption` unchanged because it supports custom user-created options through `isCustom`.

Recommended ids should be stable kebab-case strings, for example:

- `eye-level-angle`
- `worms-eye-view`
- `first-person-pov`
- `over-the-shoulder-view`

### Update `videoSceneOptions.ts`

Export two new lists beside `defaultCameraOptions` and `environmentDescriptions`:

```ts
export const cameraAngleOptions: CameraGuidanceOption[] = [...];
export const cameraPerspectiveOptions: CameraGuidanceOption[] = [...];
```

Each option should include a short description suitable for prompt construction. The description should explain how the selected value affects framing or viewer relationship, not just repeat the label.

Example descriptions:

- `Eye-Level Angle`: `Frame the scene from a neutral human eye height.`
- `High Angle`: `Look down on the subject to make the scene feel smaller or more vulnerable.`
- `Low Angle`: `Look up at the subject to make it feel larger, stronger, or more imposing.`
- `First-Person POV`: `Describe the shot as if seen directly through a character or viewer's eyes.`
- `Over-the-Shoulder View`: `Frame the scene from behind or beside a character's shoulder, looking toward the action.`
- `CCTV / Surveillance View`: `Use a fixed observational surveillance-camera viewpoint.`

## Video Scene UI Changes

### Add state in `VideoSceneView.tsx`

Import the new option lists:

```ts
import {
	cameraAngleOptions,
	cameraPerspectiveOptions,
	defaultCameraOptions,
	environmentDescriptions
} from './videoSceneOptions';
```

Add state near the existing selected camera state:

```ts
const [selectedCameraAngleId, setSelectedCameraAngleId] = useState(
	cameraAngleOptions[0].id
);
const [selectedCameraPerspectiveId, setSelectedCameraPerspectiveId] = useState(
	cameraPerspectiveOptions[0].id
);
```

Derive selected option objects near `selectedCamera`:

```ts
const selectedCameraAngle =
	cameraAngleOptions.find((option) => option.id === selectedCameraAngleId) ??
	cameraAngleOptions[0];

const selectedCameraPerspective =
	cameraPerspectiveOptions.find(
		(option) => option.id === selectedCameraPerspectiveId
	) ?? cameraPerspectiveOptions[0];
```

### Add two dropdowns to the controls column

Place the new dropdowns near `Camera Position Change`, preferably immediately after it, because all three controls describe camera behavior:

1. `Camera angle`
2. `Camera perspective`

Use the same Fluent UI `Field`, `Dropdown`, and `Option` pattern already used by `Camera Position Change` and `Environment change`.

Dropdown behavior:

- Disabled while `generating` or `suggesting`.
- `value` displays the selected label.
- `selectedOptions` contains the selected id.
- `onOptionSelect` updates the matching selected id.
- Render all options from the matching list.
- Show helper text under each dropdown with the selected option description.

Example structure:

```tsx
<Field label="Camera angle">
	<Dropdown
		value={selectedCameraAngle.label}
		selectedOptions={[selectedCameraAngle.id]}
		disabled={generating || suggesting}
		onOptionSelect={(_, data) => {
			if (data.optionValue) {
				setSelectedCameraAngleId(data.optionValue);
			}
		}}
	>
		{cameraAngleOptions.map((option) => (
			<Option key={option.id} value={option.id} text={option.label}>
				{option.label}
			</Option>
		))}
	</Dropdown>
</Field>
<Text className={styles.helperText} size={200}>
	{selectedCameraAngle.description}
</Text>
```

Repeat the same pattern for `Camera perspective`.

## Prompt Generation Changes

### Update `buildVideoPromptInstruction()` signature

Current signature:

```ts
function buildVideoPromptInstruction(
	camera: CameraPositionOption,
	soundEnabled: boolean,
	soundDetail: string,
	mainAction: string,
	environmentLevel: EnvironmentChangeLevel
): string
```

Change it to accept the new selected options:

```ts
function buildVideoPromptInstruction(
	camera: CameraPositionOption,
	cameraAngle: CameraGuidanceOption,
	cameraPerspective: CameraGuidanceOption,
	soundEnabled: boolean,
	soundDetail: string,
	mainAction: string,
	environmentLevel: EnvironmentChangeLevel
): string
```

Import `CameraGuidanceOption` as a type from `videoSceneTypes.ts`.

### Add camera angle and perspective to the instruction text

Inside the returned instruction array, add lines after `Camera position change`:

```ts
`Camera angle: ${cameraAngle.label}. ${cameraAngle.description}`,
`Camera perspective: ${cameraPerspective.label}. ${cameraPerspective.description}`,
'Every returned prompt must explicitly respect the selected camera angle and camera perspective while preserving continuity between Image 1 and Image 2.',
```

Keep the existing special handling for `None / hold start camera`. The new angle and perspective selections should still apply as descriptive framing guidance, while `None / hold start camera` means no camera movement.

### Update the `generatePrompts()` call

Pass the selected options into `buildVideoPromptInstruction()`:

```ts
instruction: buildVideoPromptInstruction(
	selectedCamera,
	selectedCameraAngle,
	selectedCameraPerspective,
	soundEnabled,
	soundDetail,
	mainAction,
	environmentLevel
),
```

### Update the text item sent to `imageApi.improvePrompt()`

Current text context includes main action, camera position change, environment change, and sound. Add two lines:

```ts
`Camera angle: ${selectedCameraAngle.label} - ${selectedCameraAngle.description}`,
`Camera perspective: ${selectedCameraPerspective.label} - ${selectedCameraPerspective.description}`,
```

Recommended final order:

1. Main action
2. Camera position change
3. Camera angle
4. Camera perspective
5. Environment change level
6. Sound

## Camera Suggestion Behavior

Keep `suggestCamera()` unchanged for this change unless product direction says otherwise.

Reasoning:

- The existing button is labelled `Suggest` beside `Camera Position Change`.
- It currently chooses one camera movement/position option from `defaultCameraOptions` plus custom camera styles.
- Adding angle and perspective suggestion to the same button would make the response parsing and UI meaning broader than the current control label.

Optional future enhancement:

- Rename the button to `Suggest camera setup`.
- Ask the model to return three strict lines:
	- `Camera: <exact camera position label>`
	- `Angle: <exact camera angle label>`
	- `Perspective: <exact camera perspective label>`
- Parse and apply all three selections only if each returned label matches an available option.

Do not include this optional behavior in the initial implementation unless requested.

## Output Behavior

No new output cards are required.

The existing output cards remain:

- `Short Prompt`
- `Medium Prompt`
- `Large Prompt`

The generated text inside all three prompts must include or clearly reflect:

- selected camera position change
- selected camera angle
- selected camera perspective
- selected environment change level
- selected sound behavior
- selected duration
- start-frame to end-frame continuity

The existing `parsePromptSet()` format should remain unchanged:

```text
DURATION_SECONDS: <integer from 4 to 15>

SHORT:
<one concise video prompt>

MEDIUM:
<one moderately detailed video prompt>

LARGE:
<one richly detailed video prompt>
```

## Validation Plan

### Type and build validation

Run from `Src`:

```powershell
npm run typecheck
```

This should catch:

- missing imports
- incorrect `CameraGuidanceOption` typing
- invalid `Dropdown` state usage
- any signature mismatch after changing `buildVideoPromptInstruction()`

### Manual UI validation

Start the app from `Src`:

```powershell
npm start
```

Then verify the Video Scene screen:

1. Open `Video Scene`.
2. Confirm `Camera angle` dropdown appears near `Camera Position Change`.
3. Confirm `Camera perspective` dropdown appears near `Camera Position Change`.
4. Confirm each dropdown contains all requested values.
5. Change both dropdowns and confirm helper text updates.
6. Add a start frame and end frame.
7. Enter a main action.
8. Generate scenes.
9. Confirm Short, Medium, and Large prompts reflect the selected angle and perspective.
10. Confirm changing only angle or perspective changes the next generated prompt context.

### Regression checks

Verify existing Video Scene behavior still works:

- custom camera style add/remove
- camera position suggestion
- sound enabled and disabled states
- environment change dropdown
- generated duration display
- copy buttons
- Scene screen handoff into Video Scene

## Expected Files to Modify

1. `Src/src/features/videoScene/videoSceneTypes.ts`
	 - Add `CameraGuidanceOption`.

2. `Src/src/features/videoScene/videoSceneOptions.ts`
	 - Import `CameraGuidanceOption`.
	 - Add `cameraAngleOptions`.
	 - Add `cameraPerspectiveOptions`.

3. `Src/src/features/videoScene/VideoSceneView.tsx`
	 - Import new option lists and type.
	 - Add selected angle and selected perspective state.
	 - Add selected option derivations.
	 - Render the two new dropdowns and helper text.
	 - Update `buildVideoPromptInstruction()`.
	 - Update `generatePrompts()` instruction and text item.

No Electron main-process, preload, IPC, shared type, AppShell, or Scene screen changes are required for this feature.

## Implementation Order

1. Add `CameraGuidanceOption` to `videoSceneTypes.ts`.
2. Add `cameraAngleOptions` and `cameraPerspectiveOptions` to `videoSceneOptions.ts`.
3. Update imports in `VideoSceneView.tsx`.
4. Add state and selected option derivations in `VideoSceneView.tsx`.
5. Add the two dropdowns and helper text in the controls column.
6. Update `buildVideoPromptInstruction()` to include angle and perspective.
7. Update `generatePrompts()` to pass and include the new selections.
8. Run `npm run typecheck` from `Src`.
9. Manually launch the app and verify the Video Scene workflow.

