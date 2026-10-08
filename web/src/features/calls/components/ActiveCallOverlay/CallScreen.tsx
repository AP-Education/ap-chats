import { createStyles, keyframes } from 'antd-style';

import { CallBackdrop } from '../CallBackdrop/CallBackdrop';
import { CallControls } from './CallControls';
import { CallHeader } from './CallHeader';
import { CallStage } from './CallStage/CallStage';
import { type Callee, useCallStageParticipants } from './CallStage/useCallStageParticipants';
import { MutedMicrophoneHint } from './controls/MutedMicrophoneHint';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const useStyles = createStyles(({ token, css }) => ({
  screen: css`
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    color: ${token.colorText};
    animation: ${fadeIn} 0.2s ease-out;
  `,
  stage: css`
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  `,
  controls: css`
    position: relative;
    z-index: 1;
    flex-shrink: 0;

    // Over video the controls float on a scrim instead of taking their own row.
    [data-cinema] > & {
      position: absolute;
      inset: auto 0 0;
      z-index: 2;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
    }
  `,
}));

/** A DM call waits on one known person; a channel call has nobody specific to show. */
function directCallee(title: string, avatarPath: string | null | undefined): Callee | undefined {
  if (avatarPath === undefined) return undefined;
  return { name: title, avatarPath };
}

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
  const { styles } = useStyles();
  // One resolution of "what's on stage" shared by the stage itself and by
  // this chrome decision, so they can't drift out of sync (e.g. the header
  // floating over what turns out to be an avatar view once a camera track
  // drops, because it decided "has video" independently of what the stage
  // actually ended up rendering).
  const view = useCallStageParticipants(workspaceId, directCallee(title, calleeAvatarPath));
  // Cinema mode: once there's video to protect, the header and controls float over
  // it, the same split every video-call app makes between audio and video screens.
  const cinema = view.kind === 'dominant' || view.kind === 'grid';

  return (
    <div className={styles.screen} data-cinema={cinema || undefined}>
      <CallBackdrop />
      <CallHeader title={title} duration={duration} onMinimize={onMinimize} />
      <div className={styles.stage}>
        <CallStage view={view} />
      </div>
      <div className={styles.controls}>
        <MutedMicrophoneHint />
        <CallControls />
      </div>
    </div>
  );
}
