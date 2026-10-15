import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { createStyles } from 'antd-style';

import { withViewTransition } from '@/shared/hooks/withViewTransition';

import { useActiveCall } from '../../hooks/useActiveCall';
import { useLeaveActiveCall } from '../../hooks/useLeaveActiveCall';
import { announceCallEnd } from '../../sound/callEndCue';
import type { ActiveCallSession } from '../../store/call-store';
import { useCallStore } from '../../store/call-store';
import { CallPresenceCues } from './CallPresenceCues';
import { CallScreen } from './CallScreen';
import { MiniCallBar } from './MiniCallBar';
import { OutgoingRingback } from './OutgoingRingback';
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
  // The server's answer time, not this device's: the timer holds across a rejoin or a reload. The
  // caller learns it once the answer comes in.
  const live = useActiveCall(session.workspaceId, session.channelId);
  const liveAnsweredAt = live.data?.id === session.callId ? live.data.answeredAt : null;
  const answeredAt = session.answeredAt ?? liveAnsweredAt;
  const duration = useCallDuration(answeredAt);
  const statusLine = answeredAt ? duration : 'Виклик';

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
        onDisconnected={() => {
          announceCallEnd(session, 'ended');
          leaveCall.mutate();
        }}
      >
        <RoomAudioRenderer />
        <CallPresenceCues group={session.calleeAvatarPath === undefined} />
        <OutgoingRingback session={session} />
        {minimized ? (
          <MiniCallBar
            title={session.title}
            duration={statusLine}
            onExpand={() => withViewTransition(restore)}
          />
        ) : (
          <CallScreen
            title={session.title}
            duration={statusLine}
            workspaceId={session.workspaceId}
            onMinimize={() => withViewTransition(minimize)}
            calleeAvatarPath={session.calleeAvatarPath}
          />
        )}
      </LiveKitRoom>
    </div>
  );
}
