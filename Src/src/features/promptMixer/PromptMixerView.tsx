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
import {
  defaultImageModel,
  defaultSize,
  defaultTextModel,
  imageModels,
  textModels
} from '../../config/models';
import type { ImageSize } from '../../../shared/types';
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
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap'
  }
});

export function PromptMixerView() {
  const styles = useStyles();
  const [ideas, setIdeas] = useState<string[]>(['', '']);
  const [textModel, setTextModel] = useState(defaultTextModel);
  const [imageModel, setImageModel] = useState(defaultImageModel);
  const [size, setSize] = useState<ImageSize>(defaultSize);
  const [combined, setCombined] = useState('');
  const [improving, setImproving] = useState(false);
  const [mixError, setMixError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const { status, busy, error, resultUrl, generate } = useGeneration();

  const updateIdea = (index: number, value: string) => {
    setIdeas((current) => current.map((idea, i) => (i === index ? value : idea)));
  };

  const addIdea = () => setIdeas((current) => [...current, '']);

  const removeIdea = (index: number) =>
    setIdeas((current) => current.filter((_, i) => i !== index));

  const onImprove = async () => {
    setMixError(null);
    setImproving(true);
    try {
      const result = await imageApi.improvePrompt({
        model: textModel,
        prompts: ideas.filter((idea) => idea.trim())
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
    const finalPrompt = combined.trim() || ideas.filter((i) => i.trim()).join('. ');
    const result = await generate({
      mode: 'text-fusion',
      prompt: finalPrompt,
      model: imageModel,
      size
    });
    if (result?.success && result.image) {
      setLastId(result.image.id);
    }
  };

  const hasIdeas = ideas.some((idea) => idea.trim());

  return (
    <div className={styles.layout}>
      <Card className={styles.controls}>
        <Title3>Prompt mixer</Title3>
        <Subtitle2>Text ideas</Subtitle2>
        {ideas.map((idea, index) => (
          <div key={index} className={styles.ideaRow}>
            <Field style={{ flex: 1 }}>
              <Input
                value={idea}
                placeholder={`Idea ${index + 1}`}
                disabled={improving || busy}
                onChange={(_, data) => updateIdea(index, data.value)}
              />
            </Field>
            <Button
              appearance="subtle"
              icon={<Dismiss20Regular />}
              disabled={ideas.length <= 1 || improving || busy}
              onClick={() => removeIdea(index)}
              aria-label={`Remove idea ${index + 1}`}
            />
          </div>
        ))}
        <Button
          appearance="secondary"
          icon={<Add20Regular />}
          disabled={improving || busy}
          onClick={addIdea}
        >
          Add idea
        </Button>

        <ModelSelector
          label="Text model (for combining)"
          options={textModels}
          value={textModel}
          onChange={setTextModel}
          disabled={improving || busy}
        />
        <Button
          appearance="secondary"
          icon={improving ? <Spinner size="tiny" /> : <Wand20Regular />}
          disabled={!hasIdeas || improving || busy}
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
          disabled={busy || (!combined.trim() && !hasIdeas)}
          onClick={() => void onGenerate()}
        >
          {busy ? getStatusText(status) : 'Generate from prompt'}
        </Button>
        <Text size={200}>
          Tip: combine multiple ideas, then generate one image from the result.
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
