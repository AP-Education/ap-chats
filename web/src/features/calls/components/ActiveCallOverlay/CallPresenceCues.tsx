import { useRoomContext } from '@livekit/components-react';
import { useEffect } from 'react';

import { playJoinChime, playLeaveChime } from '../../sound/callChimes';
import { watchRoomPresence } from './watchRoomPresence';

interface CallPresenceCuesProps {
  group: boolean;
}

/** Chimes as people join, and in a group call as they leave. Alone in the room, the ringback speaks instead. */
export function CallPresenceCues({ group }: CallPresenceCuesProps) {
  const room = useRoomContext();

  useEffect(
    () =>
      watchRoomPresence(room, {
        joined: playJoinChime,
        // In a DM the other side leaving ends the call, and that ending has its own cue.
        left: () => {
          if (group) playLeaveChime();
        },
      }),
    [room, group],
  );

  return null;
}
