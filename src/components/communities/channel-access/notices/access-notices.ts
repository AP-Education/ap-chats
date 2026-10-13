import type { ChannelAccessChangedEvent } from '../sync/channel-access-changed.event';
import type { ChannelMemberPair } from '../sync/types';

export type AccessNotice =
  | { event: 'communities:channel-granted'; memberId: string; channelId: string }
  | { event: 'communities:channel-revoked'; memberId: string; channelId: string }
  | { event: 'communities:access-changed'; memberId: string }
  | { event: 'communities:channel-permissions-changed'; memberId: string; channelId: string };

const pairKey = ({ channelId, memberId }: ChannelMemberPair) => `${channelId}:${memberId}`;

/**
 * Who learns what after a recalculation. `participants` are the people in each recalculated
 * channel once it is done, and are needed only when channels, not people, were recalculated.
 */
export function accessNotices(
  { scope, changes }: ChannelAccessChangedEvent,
  participants: ReadonlyMap<string, readonly string[]>,
): AccessNotice[] {
  const granted = changes.granted.map(({ channelId, memberId }): AccessNotice => ({
    event: 'communities:channel-granted',
    memberId,
    channelId,
  }));
  const revoked = changes.revoked.map(({ channelId, memberId }): AccessNotice => ({
    event: 'communities:channel-revoked',
    memberId,
    channelId,
  }));

  if ('memberIds' in scope) {
    // Their roles changed, so what they may do in channels they keep may have changed too.
    const regranted = scope.memberIds.map((memberId): AccessNotice => ({
      event: 'communities:access-changed',
      memberId,
    }));
    return [...granted, ...revoked, ...regranted];
  }

  // A newcomer learns the lists from the grant itself, so only those already there hear of them.
  const newcomers = new Set(changes.granted.map(pairKey));
  const relisted = scope.channelIds.flatMap((channelId) =>
    (participants.get(channelId) ?? [])
      .filter((memberId) => !newcomers.has(pairKey({ channelId, memberId })))
      .map((memberId): AccessNotice => ({
        event: 'communities:channel-permissions-changed',
        memberId,
        channelId,
      })),
  );
  return [...granted, ...revoked, ...relisted];
}
