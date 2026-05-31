import { useState } from 'react';
import {
  Button,
  Card,
  MessageBar,
  MessageBarBody,
  Subtitle2,
  Title3,
  Tag,
  TagGroup,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { Beaker20Regular } from '@fluentui/react-icons';
import { ImageDropzone } from '../../components/ImageDropzone';
import { ImageThumbnailList } from '../../components/ImageThumbnailList';
import { ImagePreview } from '../../components/ImagePreview';
import { PromptInput } from '../../components/PromptInput';
import { ModelSelector } from '../../components/ModelSelector';
import { SizeSelector } from '../../components/SizeSelector';
import {
  defaultImageModel,
  defaultSize,
  imageModels,
  stylePresets
} from '../../config/models';
import type { ImageSize, SourceImage } from '../../../shared/types';
import { getStatusText, useGeneration } from '../../hooks/useGeneration';
import { useSelection, type SelectedSource } from '../../hooks/useSelection';
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
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap'
  }
});

function buildFusionPrompt(
  prompt: string,
  presets: string[],
  sources: SelectedSource[]
): string {
  const parts = [prompt.trim()];
  if (presets.length) {
    parts.push(`Style presets: ${presets.join(', ')}.`);
  }
  if (sources.length) {
    parts.push(
      `Source image weights: ${sources
        .map(
          (source, index) =>
            `Image ${index + 1} (${source.name}) ${source.weightPercent}%`
        )
        .join('; ')}. Respect these proportions in the final fusion.`
    );
  }
  return parts.filter(Boolean).join('\n\n');
}

export function FusionView() {
  const styles = useStyles();
  const { sources, addMany, remove, move, updateWeight } = useSelection();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(defaultImageModel);
  const [size, setSize] = useState<ImageSize>(defaultSize);
  const [presets, setPresets] = useState<string[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);
  const { status, busy, error, resultUrl, generate } = useGeneration();

  const togglePreset = (preset: string) => {
    setPresets((current) =>
      current.includes(preset)
        ? current.filter((p) => p !== preset)
        : [...current, preset]
    );
  };

  const removePreset = (preset: string) => {
    setPresets((current) => current.filter((p) => p !== preset));
  };

  const onGenerate = async () => {
    const images: SourceImage[] = sources.map((source) => ({
      data: source.dataUrl,
      name: source.name
    }));
    const result = await generate({
      mode: sources.length >= 2 ? 'image-fusion' : 'text-image-fusion',
      prompt: buildFusionPrompt(prompt, presets, sources),
      model,
      size,
      images,
      sourceImageIds: sources
        .map((s) => s.libraryId)
        .filter((id): id is string => Boolean(id))
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

  const totalWeight = sources.reduce(
    (sum, source) => sum + source.weightPercent,
    0
  );
  const weightsValid = sources.length > 0 && totalWeight === 100;

  const canGenerate =
    !busy && sources.length >= 1 && prompt.trim().length > 0 && weightsValid;

  return (
    <div className={styles.layout}>
      <Card className={styles.controls}>
        <Title3>Fusion</Title3>
        <Subtitle2>Source images</Subtitle2>
        <ImageDropzone
          disabled={busy}
          onImages={(images) =>
            addMany(
              images.map((image) => ({
                id: image.id,
                name: image.name,
                dataUrl: image.dataUrl
              }))
            )
          }
          onErrors={setFileErrors}
        />
        {fileErrors.length ? (
          <MessageBar intent="warning">
            <MessageBarBody>{fileErrors.join(' ')}</MessageBarBody>
          </MessageBar>
        ) : null}
        <ImageThumbnailList
          images={sources}
          onRemove={remove}
          onMove={move}
          onWeightChange={updateWeight}
          showWeights
          disabled={busy}
        />
        {sources.length > 0 && !weightsValid ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              Source percentages must total 100%. Current total: {totalWeight}%.
            </MessageBarBody>
          </MessageBar>
        ) : null}

        <PromptInput
          label="Fusion instructions"
          value={prompt}
          placeholder="Blend these into a single dreamy double-exposure portrait"
          rows={4}
          disabled={busy}
          onChange={setPrompt}
        />

        <Subtitle2>Style presets</Subtitle2>
        <TagGroup
          onDismiss={(event, data) => {
            event.stopPropagation();
            removePreset(String(data.value));
          }}
        >
          {stylePresets.map((preset) => (
            <Tag
              key={preset}
              value={preset}
              appearance={presets.includes(preset) ? 'brand' : 'outline'}
              dismissible={presets.includes(preset)}
              onClick={() => togglePreset(preset)}
            >
              {preset}
            </Tag>
          ))}
        </TagGroup>

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
          icon={<Beaker20Regular />}
          disabled={!canGenerate}
          onClick={() => void onGenerate()}
        >
          {busy ? getStatusText(status) : 'Generate fusion'}
        </Button>
      </Card>

      <ImagePreview
        imageUrl={resultUrl}
        loading={busy}
        loadingLabel={getStatusText(status)}
        error={error}
        emptyHint="Add one or more source images and describe how to fuse them."
        onExport={lastId ? () => void onExport() : undefined}
      />
    </div>
  );
}
