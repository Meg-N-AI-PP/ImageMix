import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Divider,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Subtitle2,
  Text,
  Title3,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { imageModels, textModels } from '../../config/models';
import { imageApi } from '../../services/imageApi';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '720px'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  models: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS
  }
});

export function SettingsView() {
  const styles = useStyles();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [saveLocation, setSaveLocation] = useState('');
  const [version, setVersion] = useState('');

  useEffect(() => {
    void (async () => {
      const [status, location, appVersion] = await Promise.all([
        imageApi.getApiKeyStatus(),
        imageApi.getSaveLocation(),
        imageApi.getAppVersion()
      ]);
      setConfigured(status.configured);
      setSaveLocation(location);
      setVersion(appVersion);
    })();
  }, []);

  const onSaveApiKey = async () => {
    setSavingKey(true);
    setKeyMessage(null);
    try {
      const status = await imageApi.setApiKey(apiKeyInput.trim());
      setConfigured(status.configured);
      setApiKeyInput('');
      setKeyMessage(
        status.configured ? 'API key saved.' : 'API key cleared.'
      );
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <div className={styles.root}>
      <Title3>Settings</Title3>

      <Card className={styles.card}>
        <Subtitle2>OpenAI API key</Subtitle2>
        <div className={styles.row}>
          {configured === null ? (
            <Text>Checking…</Text>
          ) : configured ? (
            <Badge appearance="filled" color="success">
              Configured
            </Badge>
          ) : (
            <Badge appearance="filled" color="warning">
              Not configured
            </Badge>
          )}
        </div>
        <Field label="API key">
          <Input
            type="password"
            value={apiKeyInput}
            placeholder="sk-..."
            onChange={(_, data) => setApiKeyInput(data.value)}
          />
        </Field>
        <div className={styles.row}>
          <Button
            appearance="primary"
            disabled={savingKey || apiKeyInput.trim().length === 0}
            onClick={() => void onSaveApiKey()}
          >
            {savingKey ? 'Saving…' : 'Save key'}
          </Button>
          <Text size={200}>
            Stored locally on this device. You can also set OPENAI_API_KEY in a
            .env file.
          </Text>
        </div>
        {keyMessage ? (
          <MessageBar intent="success">
            <MessageBarBody>{keyMessage}</MessageBarBody>
          </MessageBar>
        ) : null}
      </Card>

      <Card className={styles.card}>
        <Subtitle2>Models</Subtitle2>
        <Text size={200}>Image models</Text>
        <div className={styles.models}>
          {imageModels.map((model) => (
            <Badge key={model.id} appearance="outline">
              {model.label}
            </Badge>
          ))}
        </div>
        <Text size={200}>Text models</Text>
        <div className={styles.models}>
          {textModels.map((model) => (
            <Badge key={model.id} appearance="outline">
              {model.label}
            </Badge>
          ))}
        </div>
        <Text size={100}>
          Edit src/config/models.ts to change available models.
        </Text>
      </Card>

      <Card className={styles.card}>
        <Subtitle2>Storage</Subtitle2>
        <Field label="Saved images location">
          <Input readOnly value={saveLocation} />
        </Field>
      </Card>

      <Divider />
      <Text size={200}>ImageMix version {version}</Text>
    </div>
  );
}
