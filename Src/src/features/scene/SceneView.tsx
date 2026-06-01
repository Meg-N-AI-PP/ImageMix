import { useState } from 'react';
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
import { ArrowRight20Regular, Wand20Regular } from '@fluentui/react-icons';
import { ImageDropzone } from '../../components/ImageDropzone';
import { ImageThumbnailList } from '../../components/ImageThumbnailList';
import { ImagePreview } from '../../components/ImagePreview';
import { PromptInput } from '../../components/PromptInput';
import { ModelSelector } from '../../components/ModelSelector';
import { SizeSelector } from '../../components/SizeSelector';
import { defaultImageModel, defaultSize, imageModels } from '../../config/models';
import type { ImageSize, SourceImage } from '../../../shared/types';
import { getStatusText, useGeneration } from '../../hooks/useGeneration';
import { imageApi } from '../../services/imageApi';

interface SceneSource {
  id: string;
  name: string;
  dataUrl: string;
  libraryId?: string;
}

interface CharacterReference {
  imageName: string;
  description: string;
}

const MIN_SECONDS = 1;
const MAX_SECONDS = 60;

const useStyles = makeStyles({
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(360px, 460px) 1fr',
    gap: tokens.spacingHorizontalL,
    height: '100%'
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    overflowY: 'auto'
  },
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap'
  },
  actionButton: {
    flexShrink: 0
  },
  secondsInput: {
    width: '120px'
  }
});

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

export function SceneView() {
  const styles = useStyles();
  const [sceneSource, setSceneSource] = useState<SceneSource | null>(null);
  const [description, setDescription] = useState('');
  const [seconds, setSeconds] = useState(8);
  const [model, setModel] = useState(defaultImageModel);
  const [size, setSize] = useState<ImageSize>(defaultSize);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [multiWarning, setMultiWarning] = useState(false);
  const [improving, setImproving] = useState(false);
  const [mixError, setMixError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  const [consistentCharacterEnabled, setConsistentCharacterEnabled] =
    useState(false);
  const [characterSource, setCharacterSource] = useState<SceneSource | null>(
    null
  );
  const [characterDescription, setCharacterDescription] = useState('');
  const [characterFileErrors, setCharacterFileErrors] = useState<string[]>([]);
  const [characterMultiWarning, setCharacterMultiWarning] = useState(false);

  const { status, busy, error, resultUrl, generate } = useGeneration();

  const secondsValid =
    Number.isFinite(seconds) && seconds >= MIN_SECONDS && seconds <= MAX_SECONDS;

  const characterReady =
    !consistentCharacterEnabled ||
    (Boolean(characterSource) && characterDescription.trim().length > 0);

  const onEnhance = async () => {
    if (!sceneSource) {
      return;
    }
    setMixError(null);
    setImproving(true);
    try {
      const items =
        consistentCharacterEnabled && characterSource
          ? [
              {
                type: 'text' as const,
                text: [
                  `Scene action after ${seconds} seconds: ${description.trim()}`,
                  `Consistent character instruction: ${characterDescription.trim()}`,
                  'Image 1 is the consistent character reference.',
                  'Image 2 is the scene/start frame.'
                ].join('\n'),
                weightPercent: 34
              },
              {
                type: 'image' as const,
                data: characterSource.dataUrl,
                name: `Image 1 consistent character - ${characterSource.name}`,
                weightPercent: 33
              },
              {
                type: 'image' as const,
                data: sceneSource.dataUrl,
                name: `Image 2 scene frame - ${sceneSource.name}`,
                weightPercent: 33
              }
            ]
          : [
              {
                type: 'text' as const,
                text: description.trim(),
                weightPercent: 50
              },
              {
                type: 'image' as const,
                data: sceneSource.dataUrl,
                name: sceneSource.name,
                weightPercent: 50
              }
            ];

      const result = await imageApi.improvePrompt({
        model: 'gpt-5.5',
        instruction: [
          'Enhance this scene-continuation description for an image generation model.',
          `The generated image must show the scene ${seconds} seconds later.`,
          consistentCharacterEnabled
            ? 'Use Image 1 as the consistent character reference and explicitly preserve that character when it appears in the scene.'
            : 'Use the provided image as the starting scene frame.',
          'Keep the prompt concise, visual, and continuity-focused.',
          'Return only the enhanced prompt text.'
        ].join(' '),
        items
      });
      if (result.success && result.prompt) {
        setDescription(result.prompt);
      } else {
        setMixError(result.error ?? 'Failed to enhance description.');
      }
    } finally {
      setImproving(false);
    }
  };

  const onGenerate = async () => {
    if (!sceneSource) {
      return;
    }
    const images: SourceImage[] =
      consistentCharacterEnabled && characterSource
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

    const result = await generate({
      mode: 'scene-next-image',
      prompt,
      model,
      size,
      images,
      sourceImageIds: sceneSource.libraryId ? [sceneSource.libraryId] : undefined
    });
    if (result?.success && result.image) {
      setLastId(result.image.id);
    }
  };

  const onExport = async () => {
    if (lastId) {
      await imageApi.exportImage(lastId);
    }
  };

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

  return (
    <div className={styles.layout}>
      <Card className={styles.controls}>
        <Title3>Scene</Title3>

        <Checkbox
          checked={consistentCharacterEnabled}
          disabled={busy || improving}
          label="Enable consistent character"
          onChange={(_, data) =>
            setConsistentCharacterEnabled(Boolean(data.checked))
          }
        />

        {consistentCharacterEnabled ? (
          <>
            <Subtitle2>Consistent character</Subtitle2>
            <ImageDropzone
              disabled={busy}
              onImages={(images) => {
                if (images.length === 0) {
                  return;
                }
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
            {characterFileErrors.length ? (
              <MessageBar intent="warning">
                <MessageBarBody>
                  {characterFileErrors.join(' ')}
                </MessageBarBody>
              </MessageBar>
            ) : null}
            {characterMultiWarning ? (
              <MessageBar intent="warning">
                <MessageBarBody>
                  Consistent character uses one reference image. The first image
                  was selected.
                </MessageBarBody>
              </MessageBar>
            ) : null}
            {characterSource ? (
              <ImageThumbnailList
                images={[{ ...characterSource, weightPercent: 0 }]}
                onRemove={() => {
                  setCharacterSource(null);
                  setCharacterMultiWarning(false);
                }}
                disabled={busy}
              />
            ) : null}
            <PromptInput
              label="Consistent character description"
              value={characterDescription}
              placeholder="Use this leviathan as the same consistent monster across every generated image"
              rows={3}
              disabled={busy}
              onChange={setCharacterDescription}
            />
          </>
        ) : null}

        <Subtitle2>
          {consistentCharacterEnabled ? 'Scene image' : 'Starting image'}
        </Subtitle2>
        <ImageDropzone
          disabled={busy}
          onImages={(images) => {
            if (images.length === 0) {
              return;
            }
            const [first] = images;
            setMultiWarning(images.length > 1);
            setSceneSource({
              id: first.id,
              name: first.name,
              dataUrl: first.dataUrl
            });
          }}
          onErrors={setFileErrors}
        />
        {fileErrors.length ? (
          <MessageBar intent="warning">
            <MessageBarBody>{fileErrors.join(' ')}</MessageBarBody>
          </MessageBar>
        ) : null}
        {multiWarning ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              Scene uses one starting image. The first image was selected.
            </MessageBarBody>
          </MessageBar>
        ) : null}
        {sceneSource ? (
          <ImageThumbnailList
            images={[{ ...sceneSource, weightPercent: 0 }]}
            onRemove={() => {
              setSceneSource(null);
              setMultiWarning(false);
            }}
            disabled={busy}
          />
        ) : null}

        <PromptInput
          label="What happens next?"
          value={description}
          placeholder="The person turns toward the window as rain starts falling outside"
          rows={4}
          disabled={busy}
          onChange={setDescription}
        />

        <Field label="Seconds later">
          <Input
            className={styles.secondsInput}
            type="number"
            min={MIN_SECONDS}
            max={MAX_SECONDS}
            value={String(seconds)}
            disabled={busy}
            onChange={(_, data) => setSeconds(Number(data.value) || 0)}
          />
        </Field>
        {!secondsValid ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              Seconds must be between {MIN_SECONDS} and {MAX_SECONDS}.
            </MessageBarBody>
          </MessageBar>
        ) : null}

        {consistentCharacterEnabled && !characterReady ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              Add a consistent character image and description before enhancing
              or generating.
            </MessageBarBody>
          </MessageBar>
        ) : null}

        <Button
          appearance="secondary"
          className={styles.actionButton}
          icon={improving ? <Spinner size="tiny" /> : <Wand20Regular />}
          disabled={!canEnhance}
          onClick={() => void onEnhance()}
        >
          {improving ? 'Enhancing…' : 'Enhance description'}
        </Button>
        {mixError ? (
          <MessageBar intent="error">
            <MessageBarBody>{mixError}</MessageBarBody>
          </MessageBar>
        ) : null}

        <div className={styles.row}>
          <ModelSelector
            label="Model"
            options={imageModels}
            value={model}
            onChange={setModel}
            disabled={busy}
          />
          <SizeSelector value={size} onChange={setSize} disabled={busy} />
        </div>

        {error ? (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        ) : null}

        <Button
          appearance="primary"
          className={styles.actionButton}
          icon={<ArrowRight20Regular />}
          disabled={!canGenerate}
          onClick={() => void onGenerate()}
        >
          {busy ? getStatusText(status) : 'Next Image'}
        </Button>
      </Card>

      <ImagePreview
        imageUrl={resultUrl}
        loading={busy}
        loadingLabel={getStatusText(status)}
        error={error}
        emptyHint="Select a starting image and describe what changes after the selected seconds."
        onExport={lastId ? () => void onExport() : undefined}
      />
    </div>
  );
}
