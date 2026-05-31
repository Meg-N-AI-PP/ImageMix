import { Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalM,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(2px)',
    borderRadius: tokens.borderRadiusLarge,
    zIndex: 10
  }
});

interface LoadingOverlayProps {
  label?: string;
}

export function LoadingOverlay({ label }: LoadingOverlayProps) {
  const styles = useStyles();
  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <Spinner size="large" />
      {label ? (
        <Text weight="semibold" style={{ color: '#fff' }}>
          {label}…
        </Text>
      ) : null}
    </div>
  );
}
