import type { CallView } from '../api/calls-api';
import { useCallStore } from '../store/call-store';
import type { CallAction } from '../types';
import { useJoinCall } from './useJoinCall';
import { useStartCall } from './useStartCall';

export function useKnownCallAction(
  workspaceId: string,
  channelId: string,
  title: string,
  avatarPath: string | null | undefined,
  call: Pick<CallView, 'id' | 'status'> | null | undefined,
): CallAction {
  const session = useCallStore((state) => state.active);
  const minimized = useCallStore((state) => state.minimized);
  const restore = useCallStore((state) => state.restore);
  const join = useJoinCall(workspaceId, channelId, title, avatarPath);
  const start = useStartCall(workspaceId, channelId, title, avatarPath);
  const inCall = session?.channelId === channelId;
  const busy = Boolean(session) && !inCall;
  const joinable = call?.status === 'ringing' || call?.status === 'active';

  function onClick() {
    if (inCall) {
      if (minimized) restore();
      return;
    }
    if (busy) return;
    if (joinable && call) join.mutate(call.id);
    else start.mutate();
  }

  return {
    onClick,
    pending: join.isPending || start.isPending,
    inCall,
    busy,
    joinable,
    minimized: inCall && minimized,
  };
}
