import type { ChannelKind } from '@/components/communities/channels/types';

// Two people only for now: in a channel every read would reach everyone watching it.
export function sharesReadReceipts(kind: ChannelKind): boolean {
  return kind === 'dm';
}
