import {
  Button,
  Card,
  MessageBar,
  MessageBarBody,
  Skeleton,
  SkeletonItem,
  Text,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  AddCircle20Regular
} from '@fluentui/react-icons';
import { LoadingOverlay } from './LoadingOverlay';

const useStyles = makeStyles({
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minHeight: '320px'
  },
  preview: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '320px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusLarge,
    overflow: 'hidden'
  },
  image: {
    maxWidth: '100%',
    maxHeight: '520px',
    objectFit: 'contain'
  },
  placeholder: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap'
  },
  skeleton: {
    width: '80%',
    height: '320px'
  }
});

interface ImagePreviewProps {
  imageUrl: string | null;
  loading?: boolean;
  loadingLabel?: string;
  error?: string | null;
  emptyHint?: string;
  onExport?: () => void;
  onUseAsSource?: () => void;
}

export function ImagePreview({
  imageUrl,
  loading,
  loadingLabel,
  error,
  emptyHint = 'Your generated image will appear here.',
  onExport,
  onUseAsSource
}: ImagePreviewProps) {
  const styles = useStyles();

  return (
    <Card className={styles.root}>
      <div className={styles.preview}>
        {loading ? <LoadingOverlay label={loadingLabel} /> : null}
        {loading && !imageUrl ? (
          <Skeleton className={styles.skeleton} aria-label="Generating">
            <SkeletonItem size={128} />
          </Skeleton>
        ) : imageUrl ? (
          <img className={styles.image} src={imageUrl} alt="Generated result" />
        ) : (
          <Text className={styles.placeholder}>{emptyHint}</Text>
        )}
      </div>

      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      ) : null}

      {imageUrl && !loading ? (
        <div className={styles.actions}>
          {onUseAsSource ? (
            <Button
              appearance="secondary"
              icon={<AddCircle20Regular />}
              onClick={onUseAsSource}
            >
              Use as fusion source
            </Button>
          ) : null}
          {onExport ? (
            <Button
              appearance="primary"
              icon={<ArrowDownload20Regular />}
              onClick={onExport}
            >
              Export
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
