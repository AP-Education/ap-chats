import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { createStyles } from 'antd-style';

import { withViewTransition } from '@/shared/hooks/withViewTransition';

import { useLeaveActiveCall } from '../../hooks/useLeaveActiveCall';
import { useOutgoingRingback } from '../../hooks/useOutgoingRingback';
import { playJoinChime, playLeaveChime } from '../../sound/callChimes';
import type { ActiveCallSession } from '../../store/call-store';
import { useCallStore } from '../../store/call-store';
import { CallScreen } from './CallScreen';
import { MiniCallBar } from './MiniCallBar';
import { useCallDuration } from './useCallDuration';

const useStyles = createStyles(({ css }) => ({
  full: css`
    position: fixed;
    inset: 0;
    z-index: 1300;
  `,
  fullRoom: css`
    display: flex;
    flex-direction: column;
    height: 100%;
  `,
  // Not fixed: this bar lives in MainLayout's own flow, first child of the
  // page shell, so it reads as an app-level header strip (Telegram's "return
  // to call" bar) instead of a floating pill glued to a corner.
  mini: css`
    flex-shrink: 0;
  `,
}));

interface ActiveCallOverlayProps {
  session: ActiveCallSession;
}

// The room connection lives here, above the minimized/full split: minimizing
// only swaps the presentation, it never disconnects the call.
export function ActiveCallOverlay({ session }: ActiveCallOverlayProps) {
  const { styles } = useStyles();
  const minimized = useCallStore((state) => state.minimized);
  const minimize = useCallStore((state) => state.minimize);
  const restore = useCallStore((state) => state.restore);
  const leaveCall = useLeaveActiveCall();
  // Anchored to the call's own start, not this device's connection moment:
  // the timer stays correct across a rejoin or a page reload instead of
  // resetting to 0:00 every time.
  const duration = useCallDuration(Date.parse(session.startedAt));
  useOutgoingRingback(session.workspaceId, session.channelId);

  return (
    <div
      className={minimized ? styles.mini : styles.full}
      role={minimized ? undefined : 'dialog'}
      aria-modal={minimized ? undefined : true}
      aria-label={minimized ? undefined : 'Дзвінок'}
    >
      <LiveKitRoom
        className={minimized ? undefined : styles.fullRoom}
        serverUrl={session.url}
        token={session.token}
        connect
        audio
        video={false}
        onConnected={playJoinChime}
        onDisconnected={() => {
          playLeaveChime();
          leaveCall.mutate();
        }}
      >
        <RoomAudioRenderer />
        {minimized ? (
          <MiniCallBar
            title={session.title}
            duration={duration}
            onExpand={() => withViewTransition(restore)}
          />
        ) : (
          <CallScreen
            title={session.title}
            duration={duration}
            workspaceId={session.workspaceId}
            onMinimize={() => withViewTransition(minimize)}
            calleeAvatarPath={session.calleeAvatarPath}
          />
        )}
      </LiveKitRoom>
    </div>
  );
}
