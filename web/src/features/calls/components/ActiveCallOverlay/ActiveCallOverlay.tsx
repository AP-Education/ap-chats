import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useLeaveActiveCall } from '../../hooks/useLeaveActiveCall';
import type { ActiveCallSession } from '../../store/call-store';
import { useCallStore } from '../../store/call-store';
import { CallScreen } from './CallScreen';
import { MiniCallBar } from './MiniCallBar';
import { useCallDuration } from './useCallDuration';

const useStyles = createStyles(({ token, css }) => ({
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
  mini: css`
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 1300;

    @media (max-width: ${token.screenSM}px) {
      right: 12px;
      bottom: 12px;
    }
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
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const duration = useCallDuration(connectedAt);

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
        onConnected={() => setConnectedAt(Date.now())}
        onDisconnected={() => leaveCall.mutate()}
      >
        <RoomAudioRenderer />
        {minimized ? (
          <MiniCallBar title={session.title} duration={duration} onExpand={restore} />
        ) : (
          <CallScreen
            title={session.title}
            duration={duration}
            workspaceId={session.workspaceId}
            onMinimize={minimize}
          />
        )}
      </LiveKitRoom>
    </div>
  );
}
