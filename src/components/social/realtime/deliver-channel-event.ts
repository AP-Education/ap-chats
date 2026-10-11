import type { Namespace } from 'socket.io';

import type { AuthenticatedUser } from '@/components/auth';
import type { ChannelAudienceFacade } from '@/components/communities/channel-audience';
import type { Logger } from '@/globals/logger';
import { RealtimeRooms } from '@/globals/realtime';

interface ChannelScope {
  workspaceId: string;
  channelId: string;
}

interface ChannelEvent extends ChannelScope {
  actorMemberId?: string;
}

/** Announces a change that clients fetch again on their own, as `social:changed`. */
export function deliverChannelEvent<T extends ChannelEvent>(
  namespace: Namespace | undefined,
  audience: ChannelAudienceFacade,
  logger: Logger,
  type: string,
  event: T,
): Promise<void> {
  return broadcastToChannel(namespace, audience, logger, event, 'social:changed', {
    type,
    ...event,
  });
}

/** Sends one socket event to the sockets watching a channel, dropping those that lost access. */
export async function broadcastToChannel(
  namespace: Namespace | undefined,
  audience: ChannelAudienceFacade,
  logger: Logger,
  channel: ChannelScope,
  name: string,
  payload: object,
): Promise<void> {
  if (!namespace) return;

  const room = RealtimeRooms.socialChannel(channel.workspaceId, channel.channelId);
  try {
    const sockets = await namespace.in(room).fetchSockets();

    const userIdOf = (socket: (typeof sockets)[number]) =>
      (socket.data as { principal?: AuthenticatedUser }).principal?.sub;
    const candidateUserIds = [...new Set(sockets.map(userIdOf).filter((id): id is string => !!id))];
    const allowed = new Set(
      await audience.allowedUserIds(channel.workspaceId, channel.channelId, candidateUserIds),
    );

    for (const socket of sockets) {
      const userId = userIdOf(socket);
      if (!userId || !allowed.has(userId)) {
        await socket.leave(room);
        continue;
      }
      socket.emit(name, payload);
    }
  } catch (error) {
    logger
      .child({ channelId: channel.channelId })
      .error({ err: error }, 'Social realtime delivery failed');
  }
}
