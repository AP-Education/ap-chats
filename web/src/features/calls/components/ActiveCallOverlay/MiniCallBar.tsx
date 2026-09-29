import { useDisconnectButton, useTrackToggle } from '@livekit/components-react';
import { MicrophoneIcon, MicrophoneSlashIcon, PhoneXIcon } from '@phosphor-icons/react';
import { createStyles, keyframes } from 'antd-style';
import { Track } from 'livekit-client';

const riseIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const useStyles = createStyles(({ css }) => ({
  bar: css`
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: min(90vw, 320px);
    padding: 6px;
    border-radius: 999px;
    background: #17181c;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    animation: ${riseIn} 0.15s ease-out;
  `,
  expand: css`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 4px 6px 4px 10px;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
  `,
  dot: css`
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #2bd576;
    animation: ${pulse} 1.6s ease-in-out infinite;
  `,
  info: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
    color: #fff;
  `,
  title: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
  `,
  duration: css`
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  `,
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.22);
    }
  `,
  leave: css`
    background: #e5484d;

    &:hover {
      background: #c6373c;
    }
  `,
}));

interface MiniCallBarProps {
  title: string;
  duration: string;
  onExpand: () => void;
}

/** The Telegram/iOS "return to call" pill: the room stays connected, only the stage collapses. */
export function MiniCallBar({ title, duration, onExpand }: MiniCallBarProps) {
  const { styles, cx } = useStyles();
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const leave = useDisconnectButton({});

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.expand}
        aria-label={`Повернутися до дзвінка: ${title}`}
        onClick={onExpand}
      >
        <span className={styles.dot} aria-hidden />
        <span className={styles.info}>
          <span className={styles.title}>{title}</span>
          <span className={styles.duration}>{duration || 'З’єднуємось'}</span>
        </span>
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label={mic.enabled ? 'Вимкнути мікрофон' : 'Увімкнути мікрофон'}
        onClick={mic.buttonProps.onClick}
      >
        {mic.enabled ? <MicrophoneIcon size={16} /> : <MicrophoneSlashIcon size={16} />}
      </button>
      <button
        type="button"
        className={cx(styles.button, styles.leave)}
        aria-label="Завершити дзвінок"
        onClick={leave.buttonProps.onClick}
      >
        <PhoneXIcon size={16} weight="fill" />
      </button>
    </div>
  );
}
