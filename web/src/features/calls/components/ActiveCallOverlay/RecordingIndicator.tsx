import { useIsRecording } from '@livekit/components-react';
import { createStyles, keyframes } from 'antd-style';
import { useTranslation } from 'react-i18next';

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

// Tokens, not --ant-* variables: the call's own dark scope reaches styles only through them.
const useStyles = createStyles(({ token, css }) => ({
  indicator: css`
    display: inline-flex;
    align-items: center;
    gap: ${token.paddingXXS}px;
    margin-top: ${token.paddingXXS}px;
    padding: 2px ${token.paddingXS}px;
    border-radius: ${token.borderRadiusLG}px;
    background: color-mix(in srgb, ${token.colorError} 18%, transparent);
    color: ${token.colorText};
    font-size: ${token.fontSizeSM}px;
    line-height: 18px;
  `,
  dot: css`
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    background: ${token.colorError};
    animation: ${blink} 1.6s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,
}));

/** Tells everyone in the call while the room is being recorded, for as long as it is. */
export function RecordingIndicator() {
  const { t } = useTranslation('calls');
  const { styles } = useStyles();
  const recording = useIsRecording();

  // The live region stays in place, so a screen reader hears the moment recording starts.
  return (
    <span role="status">
      {recording && (
        <span className={styles.indicator}>
          <span className={styles.dot} aria-hidden />
          {t(($) => $.overlay.recording)}
        </span>
      )}
    </span>
  );
}
