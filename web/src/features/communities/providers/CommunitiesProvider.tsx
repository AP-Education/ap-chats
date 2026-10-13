import type { PropsWithChildren } from 'react';

import { ChannelDialogsProvider } from '../channels/providers/ChannelDialogsProvider';
import { useChannelListRealtime } from '../realtime/useChannelListRealtime';
import { useChannelsFollowRoles } from '../realtime/useChannelsFollowRoles';

/** What communities keeps running while Chats is open: current channel lists and the channel dialogs. */
export function CommunitiesProvider({ children }: PropsWithChildren) {
  useChannelListRealtime();
  useChannelsFollowRoles();

  return <ChannelDialogsProvider>{children}</ChannelDialogsProvider>;
}
