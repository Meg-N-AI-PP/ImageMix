import { useCallback, useRef, useState, type DragEvent } from 'react';
import {
  Button,
  Text,
  makeStyles,
  tokens,
  mergeClasses
} from '@fluentui/react-components';
import { ArrowUpload24Regular } from '@fluentui/react-icons';
import { loadImageFiles, type LoadedImage } from '../utils/imageFiles';
import { borderAll, borderColorAll } from '../utils/styleHelpers';

const useStyles = makeStyles({
  zone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalXXL,
    ...borderAll('2px', 'dashed', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    textAlign: 'center',
    cursor: 'pointer'
  },
  active: {
    ...borderColorAll(tokens.colorBrandStroke1),
    backgroundColor: tokens.colorNeutralBackground1Selected
  },
  hidden: {
    display: 'none'
  }
});

interface ImageDropzoneProps {
  onImages: (images: LoadedImage[]) => void;
  onErrors?: (errors: string[]) => void;
  disabled?: boolean;
}

export function ImageDropzone({
  onImages,
  onErrors,
  disabled
}: ImageDropzoneProps) {
  const styles = useStyles();
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }
      const { images, errors } = await loadImageFiles(Array.from(files));
      if (images.length) {
        onImages(images);
      }
      if (errors.length && onErrors) {
        onErrors(errors);
      }
    },
    [onImages, onErrors]
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setActive(false);
      if (disabled) {
        return;
      }
      void handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  return (
    <div
      className={mergeClasses(styles.zone, active && styles.active)}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          setActive(true);
        }
      }}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
          inputRef.current?.click();
        }
      }}
    >
      <ArrowUpload24Regular />
      <Text weight="semibold">Drop images here</Text>
      <Text size={200}>or</Text>
      <Button
        appearance="secondary"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
      >
        Browse files
      </Button>
      <Text size={200}>PNG, JPG, or WEBP up to 20 MB</Text>
      <input
        ref={inputRef}
        className={styles.hidden}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
