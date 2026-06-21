import { useState } from 'react';
import {
  Button,
  Card,
  MessageBar,
  MessageBarBody,
  Title3,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { Sparkle20Regular } from '@fluentui/react-icons';
import { PromptInput } from '../../components/PromptInput';
import { ModelSelector } from '../../components/ModelSelector';
import { SizeSelector } from '../../components/SizeSelector';
import { ImagePreview } from '../../components/ImagePreview';
import {
  defaultImageModel,
  defaultSize,
  imageModels
} from '../../config/models';
import type { ImageSize } from '../../../shared/types';
import { getStatusText, useGeneration } from '../../hooks/useGeneration';
import { useSelection } from '../../hooks/useSelection';
import { imageApi } from '../../services/imageApi';

const useStyles = makeStyles({
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 420px) 1fr',
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

interface GenerateViewProps {
  onUsedAsSource?: () => void;
}

export function GenerateView({ onUsedAsSource }: GenerateViewProps) {
  const styles = useStyles();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(defaultImageModel);
  const [size, setSize] = useState<ImageSize>(defaultSize);
  const [lastId, setLastId] = useState<string | null>(null);
  const { status, busy, error, resultUrl, generate } = useGeneration();
  const { add } = useSelection();

  const onGenerate = async () => {
    const result = await generate({
      mode: 'text-to-image',
      prompt,
      model,
      size
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

  const onUseAsSource = () => {
    if (resultUrl && lastId) {
      add({
        id: `lib-${lastId}`,
        name: 'generated.png',
        dataUrl: resultUrl,
        libraryId: lastId
      });
      onUsedAsSource?.();
    }
  };

  return (
    <div className={styles.layout}>
      <Card className={styles.controls}>
        <Title3>Text to image</Title3>
        <PromptInput
          label="Describe the image you want"
          value={prompt}
          placeholder="A cozy reading nook by a rainy window, warm lighting, soft focus"
          rows={5}
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
          icon={<Sparkle20Regular />}
          disabled={busy || !prompt.trim()}
          onClick={() => void onGenerate()}
        >
          {busy ? getStatusText(status) : 'Generate image'}
        </Button>
      </Card>

      <ImagePreview
        imageUrl={resultUrl}
        loading={busy}
        loadingLabel={getStatusText(status)}
        error={error}
        onExport={lastId ? () => void onExport() : undefined}
        onUseAsSource={resultUrl ? onUseAsSource : undefined}
      />
    </div>
  );
}
