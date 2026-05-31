# ImageMix Implementation Plan

## 1. Project Goal

Build a Windows desktop image remix/fusion app named **ImageMix**. The app will let users combine two or more images, combine text prompts with images, combine text prompts with other text prompts, and generate brand-new images from text. Generated images can be saved locally and reused as source images for later remix/fusion workflows.

All application source code must be placed inside a separate root-level folder named `Src`.

Recommended structure:

```text
ImageMix/
  Plan/
    Requirement.md
    Implementation.md
  Src/
    package.json
    vite.config.ts
    tsconfig.json
    electron/
    src/
    public/
```

## 2. Recommended Technology Stack

Use these technologies for the first version:

- **Desktop shell:** Electron
- **Frontend:** React with TypeScript
- **UI library:** Fluent UI React v9
- **Build tool:** Vite
- **OpenAI SDK:** Official OpenAI JavaScript/TypeScript SDK
- **Image handling:** Browser `File`, `Blob`, `Canvas`, and local file APIs through Electron
- **State management:** React state/hooks first; add Zustand only if state becomes difficult to manage
- **Storage:** Local app data folder for saved generated/remixed images; optional JSON metadata file for library records

## 3. Source Folder Requirement

Create a folder named `Src` at the workspace root. Put all implementation code, configuration, assets, and package files inside `Src`.

Do not place app source files directly in the workspace root or inside `Plan`.

Example command from the workspace root:

```powershell
mkdir Src
cd Src
npm create vite@latest . -- --template react-ts
npm install
npm install @fluentui/react-components @fluentui/react-icons openai electron concurrently wait-on cross-env
npm install -D electron-builder vite-plugin-electron
```

## 4. App Capabilities

### 4.1 Text To Image

Users can type a prompt and generate one or more new images.

Required behavior:

- Prompt text area for image description
- Model selector with OpenAI image model options such as `gpt-image-2` or the currently available OpenAI image generation model
- Size selector, for example square, portrait, or landscape
- Generate button
- Loading effect while generation is running
- Error message area for failed requests
- Preview generated images
- Save generated image to local library
- Allow saved generated images to be selected later as remix/fusion inputs

### 4.2 Image And Image Fusion

Users can select two or more images and create a fused/remixed result.

Required behavior:

- Add image button with file picker
- Drag-and-drop image upload area
- Thumbnail list of selected images
- Remove image action for each selected image
- Reorder selected images if possible
- Fusion prompt field for style, mood, subject, instructions, or constraints
- Generate fusion button
- Loading/progress state
- Preview fused result
- Save fused image to local library

### 4.3 Text And Image Fusion

Users can provide one or more source images plus a text prompt that guides the remix.

Required behavior:

- Selected image thumbnails
- Text instruction prompt
- Optional style presets such as cinematic, watercolor, realistic, anime, product render, poster, or surreal
- Generate button
- Result preview and save action

### 4.4 Text And Text Fusion

Users can combine multiple text ideas into a single final prompt, then generate an image from it.

Required behavior:

- Multiple text prompt inputs
- Add/remove text prompt controls
- Optional `Improve prompt` action using an OpenAI text model
- Generated final prompt preview
- Generate image from final prompt

### 4.5 Local Image Library

The app should include a local library of saved generated and remixed images.

Required behavior:

- Display saved images in a gallery/grid
- Open image preview
- Select image from library as fusion input
- Save image metadata such as prompt, model, creation date, and source type
- Delete saved image
- Export/copy image to user-selected folder

## 5. OpenAI Integration

### 5.1 API Key Handling

Do not hard-code the OpenAI API key in frontend source code.

Recommended approach for development:

- Store `OPENAI_API_KEY` in a `.env` file inside `Src`
- Add `.env` to `.gitignore`
- Use Electron main process as the secure API bridge
- Frontend calls Electron IPC methods instead of calling OpenAI directly from the browser UI

Example `.env` file:

```text
OPENAI_API_KEY=your_api_key_here
```

### 5.2 Model Selection

The requirements mention `gpt-image-2` and `gpt-5.5` or more OpenAI models. Because model names and availability can change, implement model configuration in one central file.

Recommended file:

```text
Src/src/config/models.ts
```

Suggested structure:

```ts
export const imageModels = [
  { id: 'gpt-image-2', label: 'GPT Image 2' },
  { id: 'gpt-image-1', label: 'GPT Image 1' }
];

export const textModels = [
  { id: 'gpt-5.5', label: 'GPT 5.5' },
  { id: 'gpt-4.1', label: 'GPT 4.1' }
];
```

Before final implementation, confirm the exact model IDs available in the OpenAI account and update this config file.

### 5.3 API Service Layer

Create a dedicated OpenAI service in the Electron main process.

Recommended files:

```text
Src/electron/openaiClient.ts
Src/electron/ipc/imageGenerationHandlers.ts
```

Responsibilities:

- Read API key from environment variables
- Convert selected local images to supported upload/input format
- Send text-to-image requests
- Send image-edit/fusion requests when supported by the selected OpenAI image model
- Send text prompt improvement requests through selected text model
- Return image data or saved file paths to the renderer
- Normalize OpenAI errors into user-friendly app messages

## 6. User Interface Layout

Use Fluent UI React components and keep the first screen as the working app, not a marketing page.

Recommended main layout:

- Left sidebar: workflow tabs
- Main workspace: active workflow controls and preview
- Right panel: selected sources, generation settings, and saved output actions
- Bottom or side gallery: local library access

Primary tabs:

- Generate
- Fusion
- Prompt Mixer
- Library
- Settings

### 6.1 Loading Effect

Implement a polished loading state for every generation request.

Required loading details:

- Disable generate buttons while request is active
- Show Fluent UI `Spinner`
- Show short status text such as `Preparing sources`, `Generating image`, and `Saving result`
- Show skeleton placeholders in preview area
- Allow cancellation only if the implementation can safely abort the request

## 7. Suggested Component Structure

Place React app code under `Src/src`.

Recommended files and folders:

```text
Src/src/
  App.tsx
  main.tsx
  styles.css
  components/
    AppShell.tsx
    ImageDropzone.tsx
    ImageThumbnailList.tsx
    ImagePreview.tsx
    LoadingOverlay.tsx
    ModelSelector.tsx
    PromptInput.tsx
    SavedImageGallery.tsx
    SettingsPanel.tsx
  features/
    generate/
      GenerateView.tsx
    fusion/
      FusionView.tsx
    promptMixer/
      PromptMixerView.tsx
    library/
      LibraryView.tsx
  hooks/
    useGeneration.ts
    useImageLibrary.ts
  services/
    imageApi.ts
  types/
    image.ts
    openai.ts
  config/
    models.ts
```

Place Electron code under `Src/electron`.

Recommended files:

```text
Src/electron/
  main.ts
  preload.ts
  openaiClient.ts
  fileStorage.ts
  ipc/
    imageGenerationHandlers.ts
    libraryHandlers.ts
```

## 8. Electron Responsibilities

The Electron main process should handle work that should not happen directly in the browser renderer.

Main process responsibilities:

- Create the desktop window
- Load the Vite app in development
- Load built app files in production
- Read environment variables
- Own OpenAI API calls
- Save image files to local app storage
- Read local image library metadata
- Delete/export saved images
- Provide IPC handlers to the React renderer

Renderer responsibilities:

- UI rendering
- User input collection
- Image previews
- Calling typed IPC wrapper functions
- Managing view state and loading/error states

## 9. Data Types

Create shared TypeScript types for the main app data.

Recommended `SavedImage` type:

```ts
export type SavedImage = {
  id: string;
  filePath: string;
  thumbnailPath?: string;
  prompt: string;
  model: string;
  mode: 'text-to-image' | 'image-fusion' | 'text-image-fusion' | 'text-fusion';
  sourceImageIds?: string[];
  createdAt: string;
};
```

Recommended `GenerationRequest` type:

```ts
export type GenerationRequest = {
  mode: 'text-to-image' | 'image-fusion' | 'text-image-fusion' | 'text-fusion';
  prompt: string;
  model: string;
  imagePaths?: string[];
  size?: '1024x1024' | '1024x1536' | '1536x1024';
};
```

## 10. Implementation Phases

### Phase 1: Project Setup

- Create `Src` folder
- Initialize Vite React TypeScript app inside `Src`
- Install Fluent UI, Electron, OpenAI SDK, and build dependencies
- Configure Electron main/preload files
- Configure Vite for Electron development
- Add `.env.example` and `.gitignore`
- Add npm scripts for development and build

Expected scripts:

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "vite build",
    "start": "electron ."
  }
}
```

### Phase 2: Desktop Window And App Shell

- Create Electron browser window
- Add secure preload bridge
- Render React app in the window
- Build Fluent UI app shell
- Add navigation tabs: Generate, Fusion, Prompt Mixer, Library, Settings
- Add global theme and base layout

### Phase 3: Local Image Selection And Preview

- Implement drag-and-drop image area
- Implement file picker
- Show selected image thumbnails
- Add remove image behavior
- Add image preview panel
- Validate accepted file types: PNG, JPG, JPEG, WEBP
- Validate reasonable file size limits

### Phase 4: Text-To-Image Generation

- Add prompt input and model selector
- Add size selector
- Add IPC method from renderer to Electron main process
- Implement OpenAI text-to-image call
- Display loading effect and errors
- Show generated result
- Save generated result to local app data folder
- Add generated result to local library

### Phase 5: Image Fusion Generation

- Add fusion view with image inputs and prompt field
- Convert local images for OpenAI image edit/fusion API
- Implement image fusion IPC handler
- Display generated result
- Save result and metadata
- Allow saved result to be used as future source input

### Phase 6: Prompt Mixer

- Add multiple prompt inputs
- Add prompt combine/improve action using selected text model
- Show final combined prompt
- Allow direct generation from the combined prompt
- Save generated result and metadata

### Phase 7: Library

- Implement local metadata JSON store
- Display saved image gallery
- Add open preview action
- Add select-as-source action
- Add delete action
- Add export action using Electron file dialog

### Phase 8: Settings

- Add API key status display without revealing the key
- Add model configuration view
- Add default image size setting
- Add default save location display
- Add app version/build info

### Phase 9: Polish And Reliability

- Improve loading states and skeletons
- Add empty states for each tab
- Add user-friendly error messages
- Add retry action for failed generations
- Add responsive layout for smaller windows
- Add keyboard accessibility for major controls
- Add confirmation dialog before deleting saved images

### Phase 10: Build And Packaging

- Configure Electron Builder
- Add Windows build target
- Build production app
- Test installed app behavior
- Verify image saving/exporting works outside development mode

## 11. Error Handling Requirements

Handle these cases clearly:

- Missing OpenAI API key
- Invalid model name or unavailable model
- Network failure
- OpenAI API rate limit
- Unsupported image file type
- Image file too large
- User cancels file picker/export dialog
- Save location unavailable
- Generation returns no image

Each error should appear in the UI near the related action and should not crash the app.

## 12. Security Requirements

- Never expose the OpenAI API key in React renderer code
- Use Electron `contextIsolation: true`
- Use `nodeIntegration: false`
- Expose only specific IPC functions through preload
- Validate renderer input in Electron main process before using file paths or API calls
- Keep `.env` out of source control

## 13. Testing Checklist

Manual test these workflows:

- App opens as a Windows desktop window
- Text prompt generates an image
- Generated image can be saved
- Saved generated image appears in Library
- Library image can be selected for fusion
- Two uploaded images can be fused with a prompt
- Text plus image fusion works
- Multiple text prompts can be combined
- Prompt mixer result can generate an image
- Loading states appear during every generation request
- Errors appear when API key is missing
- Delete saved image removes it from the library
- Export saved image writes to selected folder

## 14. Development Notes

- Start with a working vertical slice: one prompt generates one image and saves it to the library.
- After the vertical slice works, add image fusion, then prompt mixer.
- Keep OpenAI API logic isolated in Electron service files so model changes are easier later.
- Keep UI components reusable: image thumbnails, prompt input, model selector, preview, and loading overlay will be used in multiple tabs.
- Use a central model config file so future OpenAI models can be added without rewriting views.

## 15. Final Expected Result

At the end of implementation, ImageMix should be a Windows desktop React app using Fluent UI. It should generate images from text, fuse multiple images, combine text with images, mix multiple text prompts, save all outputs locally, and allow saved outputs to be reused as future remix/fusion inputs. All code and configuration should live under the `Src` folder.
