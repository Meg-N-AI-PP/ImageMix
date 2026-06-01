import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Image,
  Spinner,
  Text,
  Title3,
  Tooltip,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import {
  AddCircle20Regular,
  ArrowDownload20Regular,
  ArrowClockwise20Regular,
  Delete20Regular,
  Eye20Regular
} from '@fluentui/react-icons';
import { useImageLibrary, type LibraryItem } from '../../hooks/useImageLibrary';
import { useSelection } from '../../hooks/useSelection';
import { imageApi } from '../../services/imageApi';
import { borderAll } from '../../utils/styleHelpers';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    height: '100%'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    alignItems: 'start',
    gap: tokens.spacingHorizontalM,
    overflowY: 'auto',
    paddingRight: tokens.spacingHorizontalS
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    minWidth: 0,
    overflow: 'visible',
    position: 'relative',
    isolation: 'isolate',
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    boxShadow: tokens.shadow4
  },
  thumbFrame: {
    position: 'relative',
    width: '100%',
    height: '150px',
    overflow: 'hidden',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3
  },
  thumb: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  meta: {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200
  },
  actions: {
    position: 'relative',
    zIndex: 2,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    marginTop: tokens.spacingVerticalXS,
    padding: tokens.spacingVerticalXS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1
  },
  actionButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalXXS,
    minWidth: 0,
    height: '32px',
    ...borderAll('0', 'solid', 'transparent'),
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold
  },
  deleteButton: {
    color: tokens.colorPaletteRedForeground1
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalS,
    height: '60%',
    color: tokens.colorNeutralForeground3
  },
  previewSurface: {
    maxWidth: '90vw',
    width: 'fit-content'
  },
  previewContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalM
  },
  previewImg: {
    maxWidth: 'min(1024px, 85vw)',
    maxHeight: '80vh',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain'
  }
});

interface LibraryViewProps {
  onUsedAsSource?: () => void;
}

export function LibraryView({ onUsedAsSource }: LibraryViewProps) {
  const styles = useStyles();
  const { items, loading, error, refresh, removeItem } = useImageLibrary();
  const { add } = useSelection();
  const [preview, setPreview] = useState<LibraryItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LibraryItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const useAsSource = (item: LibraryItem) => {
    add({
      id: `lib-${item.id}`,
      name: item.fileName,
      dataUrl: item.dataUrl,
      libraryId: item.id
    });
    onUsedAsSource?.();
  };

  const onDelete = async () => {
    if (!confirmDelete) {
      return;
    }
    try {
      await removeItem(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title3>Library</Title3>
        <Button
          appearance="subtle"
          icon={<ArrowClockwise20Regular />}
          onClick={() => void refresh()}
        >
          Refresh
        </Button>
      </div>

      {error ? <Text>{error}</Text> : null}
      {actionError ? <Text>{actionError}</Text> : null}

      {loading ? (
        <div className={styles.empty}>
          <Spinner label="Loading library…" />
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <Text size={400}>No saved images yet.</Text>
          <Text size={200}>
            Generate or fuse an image and it will appear here automatically.
          </Text>
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <div key={item.id} className={styles.card}>
              <div className={styles.thumbFrame}>
                <img
                  className={styles.thumb}
                  src={item.dataUrl}
                  alt={item.prompt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className={styles.actions}>
                <Tooltip content="Preview full image" relationship="label">
                  <button
                    className={styles.actionButton}
                    type="button"
                    onClick={() => setPreview(item)}
                  >
                    <Eye20Regular />
                    View
                  </button>
                </Tooltip>
                <Tooltip content="Use as fusion source" relationship="label">
                  <button
                    className={styles.actionButton}
                    type="button"
                    onClick={() => useAsSource(item)}
                  >
                    <AddCircle20Regular />
                    Fusion
                  </button>
                </Tooltip>
                <Tooltip content="Export image" relationship="label">
                  <button
                    className={styles.actionButton}
                    type="button"
                    onClick={() => void imageApi.exportImage(item.id)}
                  >
                    <ArrowDownload20Regular />
                    Export
                  </button>
                </Tooltip>
                <Tooltip content="Delete image" relationship="label">
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    type="button"
                    onClick={() => setConfirmDelete(item)}
                  >
                    <Delete20Regular />
                    Delete
                  </button>
                </Tooltip>
              </div>
              <Text className={styles.meta} title={item.prompt}>
                {item.prompt || '(no prompt)'}
              </Text>
              <Text size={100}>
                {item.model} · {new Date(item.createdAt).toLocaleString()}
              </Text>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(_, data) => !data.open && setPreview(null)}
      >
        <DialogSurface className={styles.previewSurface}>
          <DialogBody>
            <DialogTitle>Image preview</DialogTitle>
            <DialogContent className={styles.previewContent}>
              {preview ? (
                <Image
                  className={styles.previewImg}
                  src={preview.dataUrl}
                  alt={preview.prompt}
                />
              ) : null}
              <Text size={200}>{preview?.prompt}</Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setPreview(null)}>
                Close
              </Button>
              {preview ? (
                <Button
                  appearance="primary"
                  icon={<ArrowDownload20Regular />}
                  onClick={() => void imageApi.exportImage(preview.id)}
                >
                  Export
                </Button>
              ) : null}
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={Boolean(confirmDelete)}
        onOpenChange={(_, data) => !data.open && setConfirmDelete(null)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete image?</DialogTitle>
            <DialogContent>
              This will permanently remove the saved image from your library.
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button appearance="primary" onClick={() => void onDelete()}>
                Delete
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
