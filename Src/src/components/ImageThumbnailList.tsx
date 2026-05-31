import {
  Button,
  Text,
  Tooltip,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import {
  ArrowLeft16Regular,
  ArrowRight16Regular,
  Dismiss16Regular
} from '@fluentui/react-icons';
import type { SelectedSource } from '../hooks/useSelection';
import { borderAll } from '../utils/styleHelpers';

const useStyles = makeStyles({
  list: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM
  },
  empty: {
    color: tokens.colorNeutralForeground3
  },
  item: {
    position: 'relative',
    width: '120px',
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    ...borderAll('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground2
  },
  thumb: {
    width: '120px',
    height: '120px',
    objectFit: 'cover',
    display: 'block'
  },
  name: {
    display: 'block',
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
    fontSize: tokens.fontSizeBase100,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  controls: {
    position: 'absolute',
    top: tokens.spacingVerticalXXS,
    right: tokens.spacingHorizontalXXS,
    display: 'flex',
    gap: '2px'
  },
  order: {
    position: 'absolute',
    bottom: '24px',
    left: tokens.spacingHorizontalXXS,
    display: 'flex',
    gap: '2px'
  }
});

interface ImageThumbnailListProps {
  images: SelectedSource[];
  onRemove: (id: string) => void;
  onMove?: (id: string, direction: -1 | 1) => void;
  disabled?: boolean;
}

export function ImageThumbnailList({
  images,
  onRemove,
  onMove,
  disabled
}: ImageThumbnailListProps) {
  const styles = useStyles();

  if (images.length === 0) {
    return (
      <Text className={styles.empty} size={200}>
        No images selected yet.
      </Text>
    );
  }

  return (
    <div className={styles.list}>
      {images.map((image, index) => (
        <div key={image.id} className={styles.item}>
          <img className={styles.thumb} src={image.dataUrl} alt={image.name} />
          <div className={styles.controls}>
            <Tooltip content="Remove" relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<Dismiss16Regular />}
                disabled={disabled}
                onClick={() => onRemove(image.id)}
              />
            </Tooltip>
          </div>
          {onMove ? (
            <div className={styles.order}>
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowLeft16Regular />}
                disabled={disabled || index === 0}
                onClick={() => onMove(image.id, -1)}
              />
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowRight16Regular />}
                disabled={disabled || index === images.length - 1}
                onClick={() => onMove(image.id, 1)}
              />
            </div>
          ) : null}
          <Text className={styles.name} title={image.name}>
            {image.name}
          </Text>
        </div>
      ))}
    </div>
  );
}
