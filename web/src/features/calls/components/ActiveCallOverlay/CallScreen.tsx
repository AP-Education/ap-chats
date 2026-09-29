import { useTrackToggle } from '@livekit/components-react';
import { CaretDownIcon, MicrophoneSlashIcon } from '@phosphor-icons/react';
import { createStyles, keyframes } from 'antd-style';
import { Track } from 'livekit-client';

import { CALL_SURFACE_GRADIENT } from '../../callTheme';
import { CallControls } from './CallControls';
import { CallStage } from './CallStage/CallStage';
import { useCallStageParticipants } from './CallStage/useCallStageParticipants';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const useStyles = createStyles(({ css }) => ({
  screen: css`
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: ${CALL_SURFACE_GRADIENT};
    animation: ${fadeIn} 0.2s ease-out;
  `,
  header: css`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    padding-top: 28px;
    color: rgba(255, 255, 255, 0.92);
    text-align: center;
  `,
  // Cinema mode: once there's video to protect, the header and controls stop
  // taking their own rows and float over it instead, on a scrim rather than
  // a solid bar — the same split every video-call app makes between an
  // audio screen (chrome in flow) and a video screen (chrome overlaid).
  headerFloating: css`
    position: absolute;
    inset: 0 0 auto;
    z-index: 2;
    padding-top: 14px;
    padding-bottom: 28px;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
  `,
  controls: css`
    position: relative;
    flex-shrink: 0;
  `,
  controlsFloating: css`
    position: absolute;
    inset: auto 0 0;
    z-index: 2;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
  `,
  // Named to match MiniCallBar's own title/duration: minimizing or restoring
  // morphs one into the other via the browser's View Transitions API
  // (withViewTransition, called where minimize/restore are triggered)
  // instead of an instant swap.
  title: css`
    font-size: 18px;
    font-weight: 650;
    view-transition-name: active-call-title;
  `,
  duration: css`
    min-height: 20px;
    color: rgba(255, 255, 255, 0.55);
    font-size: 13px;
    view-transition-name: active-call-duration;
  `,
  // Left, not right: a dismiss/collapse action reads as "back" and belongs
  // on the leading edge, the same convention iOS sheets and most call UIs
  // follow — the right side is reserved for forward actions.
  minimize: css`
    position: absolute;
    top: 16px;
    left: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }
  `,
  // A reminder, not an error: same neutral badge language as the "Дзвонимо"
  // status, just with a mic-off icon. Tapping it unmutes, same as the
  // control bar's own mic button right below. Absolutely positioned so it
  // never resizes the controls row — toggling the mic must not reflow the
  // stage above it.
  mutedBadge: css`
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
    padding: 6px 14px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    font-size: 13px;
    font-weight: 550;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.22);
    }
  `,
}));

interface CallScreenProps {
  title: string;
  duration: string;
  workspaceId: string;
  onMinimize: () => void;
  calleeAvatarPath?: string | null;
}

export function CallScreen({
  title,
  duration,
  workspaceId,
  onMinimize,
  calleeAvatarPath,
}: CallScreenProps) {
  const { styles, cx } = useStyles();
  // One resolution of "what's on stage" shared by the stage itself and by
  // this chrome decision, so they can't drift out of sync (e.g. the header
  // floating over what turns out to be an avatar view once a camera track
  // drops, because it decided "has video" independently of what the stage
  // actually ended up rendering).
  const view = useCallStageParticipants(
    workspaceId,
    calleeAvatarPath !== undefined ? { name: title, avatarPath: calleeAvatarPath } : undefined,
  );
  const hasVideo = view.kind === 'dominant' || view.kind === 'grid';
  const mic = useTrackToggle({ source: Track.Source.Microphone });

  return (
    <div className={styles.screen}>
      <div className={cx(styles.header, hasVideo && styles.headerFloating)}>
        <button
          type="button"
          className={styles.minimize}
          aria-label="Згорнути дзвінок"
          onClick={onMinimize}
        >
          <CaretDownIcon size={20} />
        </button>
        <span className={styles.title}>{title}</span>
        <span className={styles.duration}>{duration}</span>
      </div>
      <CallStage view={view} />
      <div className={hasVideo ? styles.controlsFloating : styles.controls}>
        {!mic.enabled && (
          <button
            type="button"
            className={styles.mutedBadge}
            onClick={mic.buttonProps.onClick}
            aria-label="Увімкнути мікрофон"
          >
            <MicrophoneSlashIcon size={14} weight="fill" />
            Ваш мікрофон вимкнено
          </button>
        )}
        <CallControls />
      </div>
    </div>
  );
}
