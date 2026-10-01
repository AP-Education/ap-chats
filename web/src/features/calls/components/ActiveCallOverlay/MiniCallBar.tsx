import { useDisconnectButton, useTrackToggle } from '@livekit/components-react';
import { MicrophoneIcon, MicrophoneSlashIcon, VideoCameraIcon } from '@phosphor-icons/react';
import { createStyles, keyframes } from 'antd-style';
import { Track } from 'livekit-client';

import { EndCallIcon } from '../../callIcons';
import { CALL_SURFACE_GRADIENT } from '../../callTheme';
import { CallActionButton } from './CallActionButton';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const useStyles = createStyles(({ token, css }) => ({
  bar: css`
    display: flex;
    align-items: stretch;
    gap: 12px;
    min-height: 56px;
    padding: 4px 16px;
    background: ${CALL_SURFACE_GRADIENT};
    color: ${token.colorWhite};

    @media (max-width: ${token.screenSM}px) {
      min-height: 48px;
      padding: 3px 10px;
    }
  `,
  // The clickable "return to call" area matters more than any other control
  // here — it takes almost the full bar height rather than losing most of
  // it to its own padding on top of the bar's.
  expand: css`
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
    padding: 0 10px;
    border: none;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  `,
  dot: css`
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #4ade80;
    animation: ${pulse} 1.6s ease-in-out infinite;
  `,
  info: css`
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  `,
  // Named to match CallScreen's own title/duration: restoring or minimizing
  // morphs one into the other via the browser's View Transitions API
  // instead of an instant swap.
  title: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 600;
    view-transition-name: active-call-title;
  `,
  duration: css`
    flex-shrink: 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.72);
    font-variant-numeric: tabular-nums;
    view-transition-name: active-call-duration;
  `,
  actions: css`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  `,
}));

interface MiniCallBarProps {
  title: string;
  duration: string;
  onExpand: () => void;
}

/** The app-level "return to call" strip: the room stays connected, only the stage collapses. */
export function MiniCallBar({ title, duration, onExpand }: MiniCallBarProps) {
  const { styles } = useStyles();
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const camera = useTrackToggle({ source: Track.Source.Camera });
  const leave = useDisconnectButton({});

  return (
    <div className={styles.bar} role="status">
      <button
        type="button"
        className={styles.expand}
        aria-label={`Повернутися до дзвінка: ${title}`}
        onClick={onExpand}
      >
        <span className={styles.dot} aria-hidden />
        <span className={styles.info}>
          <span className={styles.title}>{title}</span>
          <span className={styles.duration}>{duration}</span>
        </span>
      </button>
      <div className={styles.actions}>
        <CallActionButton
          size={40}
          variant={mic.enabled ? 'default' : 'off'}
          aria-label={mic.enabled ? 'Вимкнути мікрофон' : 'Увімкнути мікрофон'}
          onClick={mic.buttonProps.onClick}
        >
          {mic.enabled ? <MicrophoneIcon size={20} /> : <MicrophoneSlashIcon size={20} />}
        </CallActionButton>
        {camera.enabled && (
          <CallActionButton
            size={40}
            aria-label="Вимкнути камеру"
            onClick={camera.buttonProps.onClick}
          >
            <VideoCameraIcon size={20} />
          </CallActionButton>
        )}
        <CallActionButton
          size={40}
          variant="leave"
          aria-label="Завершити дзвінок"
          onClick={leave.buttonProps.onClick}
        >
          <EndCallIcon size={20} weight="fill" />
        </CallActionButton>
      </div>
    </div>
  );
}
