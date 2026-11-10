import { useTranslation } from 'react-i18next';

import {
  PrivateChannelIcon,
  PublicChannelIcon,
} from '@/features/communities/channels/channelIcons';
import { useChannels } from '@/features/communities/channels/hooks/useChannels';
import type { Channel } from '@/features/communities/channels/types';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import type { Suggestion, SuggestionGroup, SuggestionQuery } from './suggestions';

const CHANNEL_LIMIT = 20;

function channelSuggestion(channel: Channel): Suggestion {
  return {
    key: channel.id,
    token: { kind: 'channel', id: channel.id },
    label: channel.name,
    visual: { icon: channel.isOpen ? PublicChannelIcon : PrivateChannelIcon },
  };
}

/** After `#`: channels the viewer can see, to link to rather than to notify. */
export function useChannelSuggestions(query: SuggestionQuery | null): SuggestionGroup | null {
  const { t } = useTranslation('mentions');
  const { workspaceId } = useConversationScope();
  const channels = useChannels(workspaceId);

  if (query?.trigger !== '#') return null;

  const typed = query.text.toLocaleLowerCase();
  const items = (channels.data ?? [])
    .filter((channel) => channel.name.toLocaleLowerCase().includes(typed))
    .slice(0, CHANNEL_LIMIT)
    .map(channelSuggestion);
  return {
    heading: t(($) => $.suggestions.channels),
    ariaLabel: t(($) => $.suggestions.channelLabel),
    items,
  };
}
