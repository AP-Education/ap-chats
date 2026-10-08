import { useTrackToggle } from '@livekit/components-react';
import { MicrophoneSlashIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { Track } from 'livekit-client';

const useStyles = createStyles(({ token, css }) => ({
  // Absolutely positioned above the controls, so muting never reflows the stage.
  hint: css`
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: ${token.marginSM}px;
    padding: 6px ${token.paddingSM}px;
    border: none;
    border-radius: 999px;
    background: ${token.colorFillSecondary};
    backdrop-filter: blur(16px);
    color: ${token.colorText};
    font-size: ${token.fontSizeSM}px;
    font-weight: 550;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      background: ${token.colorFill};
    }
  `,
}));

/** A reminder, not an error: tapping it unmutes, same as the mic control below it. */
export function MutedMicrophoneHint() {
  const { styles } = useStyles();
  const mic = useTrackToggle({ source: Track.Source.Microphone });

  if (mic.enabled) return null;

  return (
    <button
      type="button"
      className={styles.hint}
      onClick={mic.buttonProps.onClick}
      aria-label="Увімкнути мікрофон"
    >
      <MicrophoneSlashIcon size={14} weight="fill" />
      Ваш мікрофон вимкнено
    </button>
  );
}
