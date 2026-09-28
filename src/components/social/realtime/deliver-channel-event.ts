import type { Namespace } from 'socket.io';

import type { AuthenticatedUser } from '@/components/auth';
import type { ChannelAudienceFacade } from '@/components/communities/channel-audience/channel-audience.facade';
import type { Logger } from '@/globals/logger';
import { RealtimeRooms } from '@/globals/realtime';

interface ChannelEvent {
  workspaceId: string;
  channelId: string;
  actorMemberId?: string;
}

export async function deliverChannelEvent<T extends ChannelEvent>(
  namespace: Namespace | undefined,
  audience: ChannelAudienceFacade,
  logger: Logger,
  type: string,
  event: T,
): Promise<void> {
  if (!namespace) return;

  const room = RealtimeRooms.socialChannel(event.workspaceId, event.channelId);
  try {
    const [sockets, workspaceSockets] = await Promise.all([
      namespace.in(room).fetchSockets(),
      namespace.in(RealtimeRooms.socialWorkspace(event.workspaceId)).fetchSockets(),
    ]);

    const userIdOf = (socket: (typeof sockets)[number]) =>
      (socket.data as { principal?: AuthenticatedUser }).principal?.sub;
    const candidateUserIds = [...new Set(sockets.map(userIdOf).filter((id): id is string => !!id))];
    const allowed = new Set(
      await audience.allowedUserIds(event.workspaceId, event.channelId, candidateUserIds),
    );

    for (const socket of sockets) {
      const userId = userIdOf(socket);
      if (!userId || !allowed.has(userId)) {
        await socket.leave(room);
        continue;
      }
      socket.emit('social:changed', { type, ...event });
    }

    const workspaceCandidates = [
      ...new Set(workspaceSockets.map(userIdOf).filter((id): id is string => !!id)),
    ];
    const workspaceAllowed = new Set(
      await audience.allowedUserIds(event.workspaceId, event.channelId, workspaceCandidates),
    );
    for (const socket of workspaceSockets) {
      const userId = userIdOf(socket);
      if (!userId || !workspaceAllowed.has(userId)) continue;
      socket.emit('social:unread', {
        workspaceId: event.workspaceId,
        channelId: event.channelId,
        type,
        actorMemberId: event.actorMemberId,
      });
    }
  } catch (error) {
    logger
      .child({ channelId: event.channelId })
      .error({ err: error }, 'Social realtime delivery failed');
  }
}
