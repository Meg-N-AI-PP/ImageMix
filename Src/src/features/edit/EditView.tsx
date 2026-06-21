import { useState } from 'react';
import {
  Button,
  Card,
  MessageBar,
  MessageBarBody,
  Subtitle2,
  Title3,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { Edit20Regular } from '@fluentui/react-icons';
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

interface EditSource {
  id: string;
  name: string;
  dataUrl: string;
  libraryId?: string;
}

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

function buildEditPrompt(prompt: string, sourceCount: number): string {
  const base = prompt.trim();
  if (sourceCount <= 1) {
    return `Edit the provided image according to these instructions:\n\n${base}`;
  }
  return `Edit the primary image according to these instructions, using the additional images as visual references when helpful:\n\n${base}`;
}

export function EditView() {
  const styles = useStyles();
  const [sources, setSources] = useState<EditSource[]>([]);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(defaultImageModel);
  const [size, setSize] = useState<ImageSize>(defaultSize);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);
  const { status, busy, error, resultUrl, generate } = useGeneration();

  const remove = (id: string) =>
    setSources((current) => current.filter((source) => source.id !== id));

  const move = (id: string, direction: -1 | 1) =>
    setSources((current) => {
      const index = current.findIndex((source) => source.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });

  const onGenerate = async () => {
    const images: SourceImage[] = sources.map((source) => ({
      data: source.dataUrl,
      name: source.name
    }));
    const result = await generate({
      mode: 'image-edit',
      prompt: buildEditPrompt(prompt, sources.length),
      model,
      size,
      images,
      sourceImageIds: sources
        .map((source) => source.libraryId)
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

  const canGenerate =
    !busy && sources.length >= 1 && prompt.trim().length > 0;

  return (
    <div className={styles.layout}>
      <Card className={styles.controls}>
        <Title3>Edit Image</Title3>
        <Subtitle2>Images to edit</Subtitle2>
        <ImageDropzone
          disabled={busy}
          onImages={(images) =>
            setSources((current) => [
              ...current,
              ...images.map((image) => ({
                id: image.id,
                name: image.name,
                dataUrl: image.dataUrl
              }))
            ])
          }
          onErrors={setFileErrors}
        />
        {fileErrors.length ? (
          <MessageBar intent="warning">
            <MessageBarBody>{fileErrors.join(' ')}</MessageBarBody>
          </MessageBar>
        ) : null}
        <ImageThumbnailList
          images={sources.map((source) => ({ ...source, weightPercent: 0 }))}
          onRemove={remove}
          onMove={move}
          disabled={busy}
        />

        <PromptInput
          label="Edit instructions"
          value={prompt}
          placeholder="Change the jacket to red, keep the face and background unchanged"
          rows={4}
          disabled={busy}
          onChange={setPrompt}
        />

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
          icon={<Edit20Regular />}
          disabled={!canGenerate}
          onClick={() => void onGenerate()}
        >
          {busy ? getStatusText(status) : 'Edit image'}
        </Button>
      </Card>

      <ImagePreview
        imageUrl={resultUrl}
        loading={busy}
        loadingLabel={getStatusText(status)}
        error={error}
        emptyHint="Add one or more images and describe how you want them edited."
        onExport={lastId ? () => void onExport() : undefined}
      />
    </div>
  );
}
