import { useState } from 'react';
import {
  Button,
  Card,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Subtitle2,
  Text,
  Title3,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import {
  Add20Regular,
  Dismiss20Regular,
  Sparkle20Regular,
  Wand20Regular
} from '@fluentui/react-icons';
import { PromptInput } from '../../components/PromptInput';
import { ModelSelector } from '../../components/ModelSelector';
import { SizeSelector } from '../../components/SizeSelector';
import { ImagePreview } from '../../components/ImagePreview';
import { ImageDropzone } from '../../components/ImageDropzone';
import type { LoadedImage } from '../../utils/imageFiles';
import {
  defaultImageModel,
  defaultSize,
  imageModels
} from '../../config/models';
import type {
  ImageSize,
  PromptMixerInput,
  SourceImage
} from '../../../shared/types';
import { getStatusText, useGeneration } from '../../hooks/useGeneration';
import { imageApi } from '../../services/imageApi';

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
  ideaRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center'
  },
  weightInput: {
    width: '80px'
  },
  itemImage: {
    width: '48px',
    height: '48px',
    objectFit: 'cover',
    borderRadius: tokens.borderRadiusMedium
  },
  itemName: {
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap'
  }
});

type MixerItem =
  | { kind: 'text'; id: string; text: string; weightPercent: number }
  | {
      kind: 'image';
      id: string;
      name: string;
      dataUrl: string;
      weightPercent: number;
    };

let mixerIdCounter = 0;
const nextMixerId = () => `mixer-${mixerIdCounter++}`;

function distributeMixerWeights(items: MixerItem[]): MixerItem[] {
  if (items.length === 0) {
    return items;
  }
  const base = Math.floor(100 / items.length);
  let remainder = 100 - base * items.length;
  return items.map((item) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { ...item, weightPercent: base + extra };
  });
}

export function PromptMixerView() {
  const styles = useStyles();
  const [items, setItems] = useState<MixerItem[]>(() =>
    distributeMixerWeights([
      { kind: 'text', id: nextMixerId(), text: '', weightPercent: 0 },
      { kind: 'text', id: nextMixerId(), text: '', weightPercent: 0 }
    ])
  );
  const [imageModel, setImageModel] = useState(defaultImageModel);
  const [size, setSize] = useState<ImageSize>(defaultSize);
  const [combined, setCombined] = useState('');
  const [improving, setImproving] = useState(false);
  const [mixError, setMixError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const { status, busy, error, resultUrl, generate } = useGeneration();

  const updateText = (id: string, value: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id && item.kind === 'text'
          ? { ...item, text: value }
          : item
      )
    );
  };

  const updateWeight = (id: string, value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, weightPercent: clamped } : item
      )
    );
  };

  const addText = () =>
    setItems((current) =>
      distributeMixerWeights([
        ...current,
        { kind: 'text', id: nextMixerId(), text: '', weightPercent: 0 }
      ])
    );

  const addImages = (images: LoadedImage[]) =>
    setItems((current) =>
      distributeMixerWeights([
        ...current,
        ...images.map<MixerItem>((image) => ({
          kind: 'image',
          id: nextMixerId(),
          name: image.name,
          dataUrl: image.dataUrl,
          weightPercent: 0
        }))
      ])
    );

  const removeItem = (id: string) =>
    setItems((current) =>
      distributeMixerWeights(current.filter((item) => item.id !== id))
    );

  const textItems = items.filter(
    (item): item is Extract<MixerItem, { kind: 'text' }> =>
      item.kind === 'text'
  );
  const imageItems = items.filter(
    (item): item is Extract<MixerItem, { kind: 'image' }> =>
      item.kind === 'image'
  );
  const filledItems = items.filter((item) =>
    item.kind === 'text' ? item.text.trim().length > 0 : true
  );
  const totalWeight = filledItems.reduce(
    (sum, item) => sum + item.weightPercent,
    0
  );
  const weightsValid = filledItems.length > 0 && totalWeight === 100;

  const buildItems = (): PromptMixerInput[] =>
    filledItems.map<PromptMixerInput>((item) =>
      item.kind === 'text'
        ? {
            type: 'text',
            text: item.text.trim(),
            weightPercent: item.weightPercent
          }
        : {
            type: 'image',
            data: item.dataUrl,
            name: item.name,
            weightPercent: item.weightPercent
          }
    );

  const onImprove = async () => {
    setMixError(null);
    setImproving(true);
    try {
      const result = await imageApi.improvePrompt({
        model: 'gpt-5.5',
        items: buildItems()
      });
      if (result.success && result.prompt) {
        setCombined(result.prompt);
      } else {
        setMixError(result.error ?? 'Failed to combine prompts.');
      }
    } finally {
      setImproving(false);
    }
  };

  const onGenerate = async () => {
    const finalPrompt =
      combined.trim() ||
      textItems
        .map((item) => item.text.trim())
        .filter(Boolean)
        .join('. ');
    const images: SourceImage[] = imageItems.map((item) => ({
      data: item.dataUrl,
      name: item.name
    }));
    const result = await generate({
      mode: images.length ? 'text-image-fusion' : 'text-fusion',
      prompt: finalPrompt,
      model: imageModel,
      size,
      images: images.length ? images : undefined
    });
    if (result?.success && result.image) {
      setLastId(result.image.id);
    }
  };

  const hasContent = filledItems.length > 0;

  return (
    <div className={styles.layout}>
      <Card className={styles.controls}>
        <Title3>Prompt mixer</Title3>
        <Subtitle2>Ideas & images</Subtitle2>
        {items.map((item) => (
          <div key={item.id} className={styles.ideaRow}>
            {item.kind === 'text' ? (
              <Field style={{ flex: 1 }}>
                <Input
                  value={item.text}
                  placeholder="Describe an idea"
                  disabled={improving || busy}
                  onChange={(_, data) => updateText(item.id, data.value)}
                />
              </Field>
            ) : (
              <>
                <img
                  className={styles.itemImage}
                  src={item.dataUrl}
                  alt={item.name}
                />
                <Text className={styles.itemName} title={item.name}>
                  {item.name}
                </Text>
              </>
            )}
            <Input
              className={styles.weightInput}
              type="number"
              min={0}
              max={100}
              value={String(item.weightPercent)}
              disabled={improving || busy}
              contentAfter={<Text size={100}>%</Text>}
              onChange={(_, data) =>
                updateWeight(item.id, Number(data.value) || 0)
              }
              aria-label={`Weight for ${item.kind === 'text' ? 'idea' : item.name}`}
            />
            <Button
              appearance="subtle"
              icon={<Dismiss20Regular />}
              disabled={items.length <= 1 || improving || busy}
              onClick={() => removeItem(item.id)}
              aria-label="Remove item"
            />
          </div>
        ))}
        <div className={styles.row}>
          <Button
            appearance="secondary"
            icon={<Add20Regular />}
            disabled={improving || busy}
            onClick={addText}
          >
            Add idea
          </Button>
        </div>
        <ImageDropzone onImages={addImages} disabled={improving || busy} />

        {filledItems.length > 0 && !weightsValid ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              Weights must total 100%. Current total: {totalWeight}%.
            </MessageBarBody>
          </MessageBar>
        ) : null}

        <Button
          appearance="secondary"
          icon={improving ? <Spinner size="tiny" /> : <Wand20Regular />}
          disabled={!hasContent || !weightsValid || improving || busy}
          onClick={() => void onImprove()}
        >
          {improving ? 'Combining…' : 'Improve & combine prompt'}
        </Button>

        {mixError ? (
          <MessageBar intent="error">
            <MessageBarBody>{mixError}</MessageBarBody>
          </MessageBar>
        ) : null}

        <PromptInput
          label="Final prompt"
          value={combined}
          placeholder="Combined prompt will appear here. You can also edit it manually."
          rows={4}
          disabled={busy}
          onChange={setCombined}
        />

        <div className={styles.row}>
          <ModelSelector
            label="Image model"
            options={imageModels}
            value={imageModel}
            onChange={setImageModel}
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
          icon={<Sparkle20Regular />}
          disabled={busy || (!combined.trim() && !hasContent)}
          onClick={() => void onGenerate()}
        >
          {busy ? getStatusText(status) : 'Generate from prompt'}
        </Button>
        <Text size={200}>
          Tip: mix text ideas and images with weights, then generate one image.
        </Text>
      </Card>

      <ImagePreview
        imageUrl={resultUrl}
        loading={busy}
        loadingLabel={getStatusText(status)}
        error={error}
        emptyHint="Combine several text ideas into one prompt, then generate."
        onExport={
          lastId ? () => void imageApi.exportImage(lastId) : undefined
        }
      />
    </div>
  );
}
