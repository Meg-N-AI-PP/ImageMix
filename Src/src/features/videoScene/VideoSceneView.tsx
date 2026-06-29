import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Subtitle2,
  Text,
  Textarea,
  Title3,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import {
  AddCircle20Regular,
  Copy20Regular,
  Delete20Regular,
  Wand20Regular
} from '@fluentui/react-icons';
import { ImageDropzone } from '../../components/ImageDropzone';
import { ImageThumbnailList } from '../../components/ImageThumbnailList';
import { PromptInput } from '../../components/PromptInput';
import { imageApi } from '../../services/imageApi';
import {
  cameraAngleOptions,
  cameraPerspectiveOptions,
  defaultCameraOptions,
  environmentDescriptions
} from './videoSceneOptions';
import type {
  CameraGuidanceOption,
  CameraPositionOption,
  EnvironmentChangeLevel,
  VideoPromptSet,
  VideoSceneDraft,
  VideoSceneImageSource
} from './videoSceneTypes';

const CUSTOM_CAMERA_STORAGE_KEY = 'imagemix.videoScene.customCameraOptions';

const useStyles = makeStyles({
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(360px, 480px) 1fr',
    gap: tokens.spacingHorizontalL,
    height: '100%'
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    overflowY: 'auto'
  },
  output: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minWidth: 0,
    overflowY: 'auto'
  },
  row: {
    display: 'flex',
    alignItems: 'end',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap'
  },
  grow: {
    flexGrow: 1,
    minWidth: '220px'
  },
  compactInput: {
    minWidth: '180px'
  },
  actionButton: {
    flexShrink: 0
  },
  promptCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS
  },
  promptHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM
  },
  promptText: {
    width: '100%'
  },
  helperText: {
    color: tokens.colorNeutralForeground3
  },
  emptyOutput: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalS,
    minHeight: '200px',
    color: tokens.colorNeutralForeground3,
    textAlign: 'center'
  }
});

interface VideoSceneViewProps {
  draft?: VideoSceneDraft | null;
  onDraftConsumed?: () => void;
}

type VideoPromptKey = Exclude<keyof VideoPromptSet, 'durationSeconds'>;

function loadCustomCameraOptions(): CameraPositionOption[] {
  try {
    const stored = localStorage.getItem(CUSTOM_CAMERA_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored) as CameraPositionOption[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (option) =>
        option &&
        typeof option.id === 'string' &&
        typeof option.label === 'string' &&
        typeof option.description === 'string'
    );
  } catch {
    return [];
  }
}

function saveCustomCameraOptions(options: CameraPositionOption[]) {
  localStorage.setItem(CUSTOM_CAMERA_STORAGE_KEY, JSON.stringify(options));
}

function createCustomCameraId(label: string): string {
  return `custom-${label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${Date.now()}`;
}

function clampDurationSeconds(value: number): number {
  return Math.max(4, Math.min(15, Math.round(value)));
}

function parsePromptSet(rawPrompt: string): VideoPromptSet | null {
  const durationMatch = rawPrompt.match(/DURATION_SECONDS:\s*(\d+)/i);
  const shortMatch = rawPrompt.match(/SHORT:\s*([\s\S]*?)(?=\n\s*MEDIUM:|$)/i);
  const mediumMatch = rawPrompt.match(/MEDIUM:\s*([\s\S]*?)(?=\n\s*LARGE:|$)/i);
  const largeMatch = rawPrompt.match(/LARGE:\s*([\s\S]*)$/i);

  const duration = durationMatch ? Number(durationMatch[1]) : NaN;
  const short = shortMatch?.[1]?.trim();
  const medium = mediumMatch?.[1]?.trim();
  const large = largeMatch?.[1]?.trim();

  if (!Number.isFinite(duration) || !short || !medium || !large) {
    return null;
  }

  return {
    durationSeconds: clampDurationSeconds(duration),
    short,
    medium,
    large
  };
}

function getEnvironmentLabel(level: EnvironmentChangeLevel): string {
  return level[0].toUpperCase() + level.slice(1);
}

function buildVideoPromptInstruction(
  camera: CameraPositionOption,
  cameraAngle: CameraGuidanceOption,
  cameraPerspective: CameraGuidanceOption,
  soundEnabled: boolean,
  soundDetail: string,
  mainAction: string,
  environmentLevel: EnvironmentChangeLevel
): string {
  const soundLine = soundEnabled
    ? soundDetail.trim().length > 0
      ? `Include this sound direction: ${soundDetail.trim()}.`
      : 'Infer fitting sound direction from the two frames and the main action.'
    : 'Do not include sound or audio direction.';

  return [
    'Create three prompts for a video generation model using two provided image frames.',
    'Image 1 is the start frame. Image 2 is the end frame.',
    'Describe motion from Image 1 to Image 2 while preserving subject identity and world continuity.',
    `Main action: ${mainAction.trim()}`,
    `Camera position change: ${camera.label}. ${camera.description}`,
    camera.id === 'none'
      ? 'Because the selected camera option is None / hold start camera, keep the camera position and framing like Image 1.'
      : 'Make the camera movement clearly follow the selected camera option.',
    `Camera angle: ${cameraAngle.label}. ${cameraAngle.description}`,
    `Camera perspective: ${cameraPerspective.label}. ${cameraPerspective.description}`,
    'Every returned prompt must explicitly respect the selected camera angle and camera perspective while preserving continuity between Image 1 and Image 2.',
    `Environment change level: ${getEnvironmentLabel(environmentLevel)}. ${environmentDescriptions[environmentLevel]}`,
    soundLine,
    'Choose the ideal video duration as a whole number from 4 to 15 seconds based on the distance between the frames, the main action, camera movement, environment change, and sound direction.',
    'Use shorter durations for simple or subtle transitions, and longer durations for major motion, complex camera movement, or large environment changes.',
    'Each prompt must explicitly fit the chosen duration.',
    'Return only this exact format:',
    'DURATION_SECONDS: <integer from 4 to 15>',
    '',
    'SHORT:',
    '<one concise video prompt>',
    '',
    'MEDIUM:',
    '<one moderately detailed video prompt>',
    '',
    'LARGE:',
    '<one richly detailed video prompt>'
  ].join('\n');
}

function PromptResultCard({
  title,
  value,
  rows,
  copied,
  onCopy
}: {
  title: string;
  value: string;
  rows: number;
  copied: boolean;
  onCopy: () => void;
}) {
  const styles = useStyles();

  return (
    <Card className={styles.promptCard}>
      <div className={styles.promptHeader}>
        <Subtitle2>{title}</Subtitle2>
        <Button
          size="small"
          appearance="secondary"
          icon={<Copy20Regular />}
          disabled={!value}
          onClick={onCopy}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <Textarea
        className={styles.promptText}
        value={value}
        readOnly
        resize="vertical"
        textarea={{ rows }}
      />
    </Card>
  );
}

export function VideoSceneView({ draft, onDraftConsumed }: VideoSceneViewProps) {
  const styles = useStyles();
  const [startImage, setStartImage] = useState<VideoSceneImageSource | null>(
    null
  );
  const [endImage, setEndImage] = useState<VideoSceneImageSource | null>(null);
  const [startErrors, setStartErrors] = useState<string[]>([]);
  const [endErrors, setEndErrors] = useState<string[]>([]);
  const [startMultiWarning, setStartMultiWarning] = useState(false);
  const [endMultiWarning, setEndMultiWarning] = useState(false);
  const [customCameraOptions, setCustomCameraOptions] = useState<
    CameraPositionOption[]
  >(() => loadCustomCameraOptions());
  const [selectedCameraId, setSelectedCameraId] = useState('none');
  const [selectedCameraAngleId, setSelectedCameraAngleId] = useState(
    cameraAngleOptions[0].id
  );
  const [selectedCameraPerspectiveId, setSelectedCameraPerspectiveId] =
    useState(cameraPerspectiveOptions[0].id);
  const [customCameraName, setCustomCameraName] = useState('');
  const [customCameraDescription, setCustomCameraDescription] = useState('');
  const [customCameraError, setCustomCameraError] = useState<string | null>(null);
  const [suggestionReason, setSuggestionReason] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundDetail, setSoundDetail] = useState('');
  const [mainAction, setMainAction] = useState('');
  const [environmentLevel, setEnvironmentLevel] =
    useState<EnvironmentChangeLevel>('medium');
  const [promptSet, setPromptSet] = useState<VideoPromptSet>({
    durationSeconds: null,
    short: '',
    medium: '',
    large: ''
  });
  const [generating, setGenerating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<VideoPromptKey | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
    },
    []
  );

  const hasPrompts = Boolean(
    promptSet.short || promptSet.medium || promptSet.large
  );

  const cameraOptions = useMemo(
    () => [...defaultCameraOptions, ...customCameraOptions],
    [customCameraOptions]
  );
  const selectedCamera =
    cameraOptions.find((option) => option.id === selectedCameraId) ??
    cameraOptions[0];
  const selectedCameraAngle =
    cameraAngleOptions.find((option) => option.id === selectedCameraAngleId) ??
    cameraAngleOptions[0];
  const selectedCameraPerspective =
    cameraPerspectiveOptions.find(
      (option) => option.id === selectedCameraPerspectiveId
    ) ?? cameraPerspectiveOptions[0];
  const selectedEnvironmentDescription = environmentDescriptions[environmentLevel];

  useEffect(() => {
    if (!draft) {
      return;
    }
    if (draft.startImage) {
      setStartImage(draft.startImage);
      setStartMultiWarning(false);
      setStartErrors([]);
    }
    if (draft.endImage) {
      setEndImage(draft.endImage);
      setEndMultiWarning(false);
      setEndErrors([]);
    }
    onDraftConsumed?.();
  }, [draft, onDraftConsumed]);

  const setFrameImage = (
    images: VideoSceneImageSource[],
    setImage: (image: VideoSceneImageSource | null) => void,
    setWarning: (value: boolean) => void
  ) => {
    if (images.length === 0) {
      return;
    }
    const [first] = images;
    setWarning(images.length > 1);
    setImage({
      id: first.id,
      name: first.name,
      dataUrl: first.dataUrl,
      libraryId: first.libraryId
    });
  };

  const addCustomCameraStyle = () => {
    const label = customCameraName.trim();
    const description = customCameraDescription.trim();
    if (!label || !description) {
      setCustomCameraError('Add a custom camera name and description.');
      return;
    }
    const duplicate = cameraOptions.some(
      (option) => option.label.toLowerCase() === label.toLowerCase()
    );
    if (duplicate) {
      setCustomCameraError('A camera style with this name already exists.');
      return;
    }

    const newOption: CameraPositionOption = {
      id: createCustomCameraId(label),
      label,
      description,
      isCustom: true
    };
    const nextCustomOptions = [...customCameraOptions, newOption];
    setCustomCameraOptions(nextCustomOptions);
    saveCustomCameraOptions(nextCustomOptions);
    setSelectedCameraId(newOption.id);
    setCustomCameraName('');
    setCustomCameraDescription('');
    setCustomCameraError(null);
  };

  const removeSelectedCustomCamera = () => {
    if (!selectedCamera.isCustom) {
      return;
    }
    const nextCustomOptions = customCameraOptions.filter(
      (option) => option.id !== selectedCamera.id
    );
    setCustomCameraOptions(nextCustomOptions);
    saveCustomCameraOptions(nextCustomOptions);
    setSelectedCameraId('none');
    setSuggestionReason(null);
    setSuggestionError(null);
  };

  const suggestCamera = async () => {
    if (!startImage || !endImage) {
      return;
    }
    setSuggestionError(null);
    setSuggestionReason(null);
    setSuggesting(true);
    try {
      const optionsText = cameraOptions
        .map((option) => `${option.label}: ${option.description}`)
        .join('\n');
      const result = await imageApi.improvePrompt({
        model: 'gpt-5.5',
        instruction: [
          'Choose the single best camera position option for a video prompt moving from Image 1 to Image 2.',
          'You must select one exact label from the available options.',
          'Return only this format: Camera: <exact option label>',
          'You may add one short reason on the next line.'
        ].join(' '),
        items: [
          {
            type: 'text',
            text: `Available camera options:\n${optionsText}`,
            weightPercent: 34
          },
          {
            type: 'image',
            data: startImage.dataUrl,
            name: `Image 1 start frame - ${startImage.name}`,
            weightPercent: 33
          },
          {
            type: 'image',
            data: endImage.dataUrl,
            name: `Image 2 end frame - ${endImage.name}`,
            weightPercent: 33
          }
        ]
      });
      if (!result.success || !result.prompt) {
        setSuggestionError(result.error ?? 'Failed to suggest a camera option.');
        return;
      }
      const cameraLine = result.prompt
        .split('\n')
        .find((line) => line.toLowerCase().startsWith('camera:'));
      const suggestedLabel = cameraLine?.replace(/^camera:\s*/i, '').trim();
      const match = cameraOptions.find(
        (option) => option.label.toLowerCase() === suggestedLabel?.toLowerCase()
      );
      if (!match) {
        setSuggestionError(
          `Suggestion did not match an available option: ${result.prompt}`
        );
        return;
      }
      setSelectedCameraId(match.id);
      const reason = result.prompt
        .split('\n')
        .slice(1)
        .join(' ')
        .trim();
      setSuggestionReason(reason || `Suggested ${match.label}.`);
    } finally {
      setSuggesting(false);
    }
  };

  const generatePrompts = async () => {
    if (!startImage || !endImage) {
      return;
    }
    setGenerationError(null);
    setPromptSet({ durationSeconds: null, short: '', medium: '', large: '' });
    setCopiedPrompt(null);
    setCopyError(null);
    setGenerating(true);
    try {
      const result = await imageApi.improvePrompt({
        model: 'gpt-5.5',
        instruction: buildVideoPromptInstruction(
          selectedCamera,
          selectedCameraAngle,
          selectedCameraPerspective,
          soundEnabled,
          soundDetail,
          mainAction,
          environmentLevel
        ),
        items: [
          {
            type: 'text',
            text: [
              `Main action: ${mainAction.trim()}`,
              `Camera position change: ${selectedCamera.label} - ${selectedCamera.description}`,
              `Camera angle: ${selectedCameraAngle.label} - ${selectedCameraAngle.description}`,
              `Camera perspective: ${selectedCameraPerspective.label} - ${selectedCameraPerspective.description}`,
              `Environment change level: ${getEnvironmentLabel(environmentLevel)} - ${selectedEnvironmentDescription}`,
              soundEnabled
                ? `Sound: ${soundDetail.trim() || 'Infer fitting sound from the frames and action.'}`
                : 'Sound: disabled'
            ].join('\n'),
            weightPercent: 34
          },
          {
            type: 'image',
            data: startImage.dataUrl,
            name: `Image 1 start frame - ${startImage.name}`,
            weightPercent: 33
          },
          {
            type: 'image',
            data: endImage.dataUrl,
            name: `Image 2 end frame - ${endImage.name}`,
            weightPercent: 33
          }
        ]
      });
      if (!result.success || !result.prompt) {
        setGenerationError(result.error ?? 'Failed to generate video prompts.');
        return;
      }
      const parsed = parsePromptSet(result.prompt);
      if (!parsed) {
        setPromptSet({
          durationSeconds: null,
          short: '',
          medium: '',
          large: result.prompt
        });
        setGenerationError(
          'The model response did not match DURATION_SECONDS/SHORT/MEDIUM/LARGE labels, so the raw response was placed in Large Prompt.'
        );
        return;
      }
      setPromptSet(parsed);
    } finally {
      setGenerating(false);
    }
  };

  const copyPrompt = async (key: VideoPromptKey) => {
    const value = promptSet[key];
    if (!value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopiedPrompt(key);
      setCopyError(null);
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = setTimeout(() => setCopiedPrompt(null), 2000);
    } catch {
      setCopyError('Could not copy to clipboard.');
    }
  };

  const canSuggest = Boolean(startImage && endImage) && !suggesting && !generating;
  const canGenerate =
    Boolean(startImage && endImage) &&
    mainAction.trim().length > 0 &&
    !generating &&
    !suggesting;

  return (
    <div className={styles.layout}>
      <Card className={styles.controls}>
        <Title3>Video Scene</Title3>

        <Subtitle2>Start frame</Subtitle2>
        <ImageDropzone
          disabled={generating || suggesting}
          onImages={(images) =>
            setFrameImage(images, setStartImage, setStartMultiWarning)
          }
          onErrors={setStartErrors}
        />
        {startErrors.length ? (
          <MessageBar intent="warning">
            <MessageBarBody>{startErrors.join(' ')}</MessageBarBody>
          </MessageBar>
        ) : null}
        {startMultiWarning ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              Video Scene uses one start frame. The first image was selected.
            </MessageBarBody>
          </MessageBar>
        ) : null}
        {startImage ? (
          <ImageThumbnailList
            images={[{ ...startImage, weightPercent: 0 }]}
            onRemove={() => {
              setStartImage(null);
              setStartMultiWarning(false);
            }}
            disabled={generating || suggesting}
          />
        ) : null}

        <Subtitle2>End frame</Subtitle2>
        <ImageDropzone
          disabled={generating || suggesting}
          onImages={(images) => setFrameImage(images, setEndImage, setEndMultiWarning)}
          onErrors={setEndErrors}
        />
        {endErrors.length ? (
          <MessageBar intent="warning">
            <MessageBarBody>{endErrors.join(' ')}</MessageBarBody>
          </MessageBar>
        ) : null}
        {endMultiWarning ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              Video Scene uses one end frame. The first image was selected.
            </MessageBarBody>
          </MessageBar>
        ) : null}
        {endImage ? (
          <ImageThumbnailList
            images={[{ ...endImage, weightPercent: 0 }]}
            onRemove={() => {
              setEndImage(null);
              setEndMultiWarning(false);
            }}
            disabled={generating || suggesting}
          />
        ) : null}

        <div className={styles.row}>
          <Field label="Camera Position Change" className={styles.grow}>
            <Dropdown
              value={selectedCamera.label}
              selectedOptions={[selectedCamera.id]}
              disabled={generating || suggesting}
              onOptionSelect={(_, data) => {
                if (data.optionValue) {
                  setSelectedCameraId(data.optionValue);
                  setSuggestionReason(null);
                  setSuggestionError(null);
                }
              }}
            >
              {cameraOptions.map((option) => (
                <Option key={option.id} value={option.id} text={option.label}>
                  {option.label}
                </Option>
              ))}
            </Dropdown>
          </Field>
          <Button
            className={styles.actionButton}
            appearance="secondary"
            icon={suggesting ? <Spinner size="tiny" /> : <Wand20Regular />}
            disabled={!canSuggest}
            onClick={() => void suggestCamera()}
          >
            {suggesting ? 'Suggesting...' : 'Suggest'}
          </Button>
          {selectedCamera.isCustom ? (
            <Button
              className={styles.actionButton}
              appearance="secondary"
              icon={<Delete20Regular />}
              disabled={generating || suggesting}
              onClick={removeSelectedCustomCamera}
            >
              Remove
            </Button>
          ) : null}
        </div>
        <Text className={styles.helperText} size={200}>
          {selectedCamera.description}
        </Text>
        {!startImage || !endImage ? (
          <Text className={styles.helperText} size={200}>
            Add a start frame and an end frame to suggest a camera or generate
            prompts.
          </Text>
        ) : null}
        {suggestionReason ? <Text size={200}>{suggestionReason}</Text> : null}
        {suggestionError ? (
          <MessageBar intent="warning">
            <MessageBarBody>{suggestionError}</MessageBarBody>
          </MessageBar>
        ) : null}

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

        <Field label="Camera perspective">
          <Dropdown
            value={selectedCameraPerspective.label}
            selectedOptions={[selectedCameraPerspective.id]}
            disabled={generating || suggesting}
            onOptionSelect={(_, data) => {
              if (data.optionValue) {
                setSelectedCameraPerspectiveId(data.optionValue);
              }
            }}
          >
            {cameraPerspectiveOptions.map((option) => (
              <Option key={option.id} value={option.id} text={option.label}>
                {option.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Text className={styles.helperText} size={200}>
          {selectedCameraPerspective.description}
        </Text>

        <Subtitle2>Add camera style</Subtitle2>
        <div className={styles.row}>
          <Input
            className={styles.compactInput}
            value={customCameraName}
            placeholder="Style name"
            disabled={generating || suggesting}
            onChange={(_, data) => setCustomCameraName(data.value)}
          />
          <Input
            className={styles.grow}
            value={customCameraDescription}
            placeholder="Describe the camera movement"
            disabled={generating || suggesting}
            onChange={(_, data) => setCustomCameraDescription(data.value)}
          />
          <Button
            className={styles.actionButton}
            appearance="secondary"
            icon={<AddCircle20Regular />}
            disabled={generating || suggesting}
            onClick={addCustomCameraStyle}
          >
            Add
          </Button>
        </div>
        {customCameraError ? (
          <MessageBar intent="warning">
            <MessageBarBody>{customCameraError}</MessageBarBody>
          </MessageBar>
        ) : null}

        <Checkbox
          checked={soundEnabled}
          disabled={generating || suggesting}
          label="Enable sound"
          onChange={(_, data) => setSoundEnabled(Boolean(data.checked))}
        />
        {soundEnabled ? (
          <PromptInput
            label="Sound detail"
            value={soundDetail}
            placeholder="Low thunder, distant alarms, footsteps on wet concrete"
            rows={2}
            disabled={generating || suggesting}
            onChange={setSoundDetail}
          />
        ) : null}

        <PromptInput
          label="Main action"
          value={mainAction}
          placeholder="The creature rises from the water and turns toward the city"
          rows={3}
          disabled={generating || suggesting}
          onChange={setMainAction}
        />

        <Field label="Environment change">
          <Dropdown
            value={getEnvironmentLabel(environmentLevel)}
            selectedOptions={[environmentLevel]}
            disabled={generating || suggesting}
            onOptionSelect={(_, data) => {
              if (data.optionValue) {
                setEnvironmentLevel(data.optionValue as EnvironmentChangeLevel);
              }
            }}
          >
            <Option value="low" text="Low">
              Low
            </Option>
            <Option value="medium" text="Medium">
              Medium
            </Option>
            <Option value="high" text="High">
              High
            </Option>
          </Dropdown>
        </Field>
        <Text className={styles.helperText} size={200}>
          {selectedEnvironmentDescription}
        </Text>

        <Field label="Seconds">
          <Input
            className={styles.compactInput}
            type="number"
            min={4}
            max={15}
            value={
              promptSet.durationSeconds === null
                ? ''
                : String(promptSet.durationSeconds)
            }
            readOnly
            contentAfter={<Text size={100}>sec</Text>}
          />
        </Field>

        {generationError ? (
          <MessageBar intent="error">
            <MessageBarBody>{generationError}</MessageBarBody>
          </MessageBar>
        ) : null}

        <Button
          appearance="primary"
          className={styles.actionButton}
          icon={generating ? <Spinner size="tiny" /> : <Wand20Regular />}
          disabled={!canGenerate}
          onClick={() => void generatePrompts()}
        >
          {generating ? 'Generating...' : 'Generate Scenes'}
        </Button>
      </Card>

      <div className={styles.output}>
        <Title3>Video prompts</Title3>
        {copyError ? (
          <MessageBar intent="warning">
            <MessageBarBody>{copyError}</MessageBarBody>
          </MessageBar>
        ) : null}
        {generating ? (
          <div className={styles.emptyOutput}>
            <Spinner label="Generating video prompts..." />
          </div>
        ) : !hasPrompts ? (
          <div className={styles.emptyOutput}>
            <Text>No prompts yet.</Text>
            <Text size={200}>
              Add a start and end frame, set your options, then choose Generate
              Scenes to get short, medium, and large video prompts.
            </Text>
          </div>
        ) : (
          <>
            <PromptResultCard
              title="Short Prompt"
              value={promptSet.short}
              rows={4}
              copied={copiedPrompt === 'short'}
              onCopy={() => void copyPrompt('short')}
            />
            <PromptResultCard
              title="Medium Prompt"
              value={promptSet.medium}
              rows={7}
              copied={copiedPrompt === 'medium'}
              onCopy={() => void copyPrompt('medium')}
            />
            <PromptResultCard
              title="Large Prompt"
              value={promptSet.large}
              rows={10}
              copied={copiedPrompt === 'large'}
              onCopy={() => void copyPrompt('large')}
            />
          </>
        )}
      </div>
    </div>
  );
}
