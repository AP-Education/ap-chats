import {
  ContentState,
  ContentStateActions,
  ContentStateDescription,
  ContentStateIcon,
  ContentStateTitle,
  Page,
  PageAside,
  PageBody,
  PageHeader,
  PageTitle,
  StatePage,
  useIsMobile,
} from '@ap-education/ui';
import { ChatsIcon, ProhibitIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { useParams } from 'react-router-dom';

import { ChannelDetail } from '@/features/communities/channels/components/ChannelDetail';
import { useChannel } from '@/features/communities/channels/hooks/useChannels';
import { ChannelMembersPanel } from '@/features/communities/memberships/components/ChannelMembersPanel';
import { ConversationProvider } from '@/features/social/conversation/store';
import { useTrackConversation } from '@/features/social/conversation/useTrackConversation';
import { WorkspaceChannelPresence } from '@/features/social/read-state/WorkspaceChannelPresence';
import { useRequiredWorkspace } from '@/features/workspaces/stores/required-workspace-context';
import { MobileMenuButton } from '@/layouts/chats/MobileMenuButton';

/** On mobile the page keeps its header, so the menu with the channel list stays one tap away. */
function NoChannelSelected() {
  const isMobile = useIsMobile();

  return (
    <Page>
      {isMobile && (
        <PageHeader>
          <MobileMenuButton />
          <PageTitle>Чати</PageTitle>
        </PageHeader>
      )}
      <PageBody>
        <ContentState>
          <ContentStateIcon>
            <ChatsIcon />
          </ContentStateIcon>
          <ContentStateTitle>Оберіть канал зі списку</ContentStateTitle>
        </ContentState>
      </PageBody>
    </Page>
  );
}

function ChannelUnavailable() {
  return (
    <StatePage>
      <ContentStateIcon>
        <ProhibitIcon />
      </ContentStateIcon>
      <ContentStateTitle>Канал недоступний</ContentStateTitle>
      <ContentStateDescription>
        Його видалили або у вас більше немає до нього доступу.
      </ContentStateDescription>
    </StatePage>
  );
}

export default function ChannelContent() {
  const { id: workspaceId } = useRequiredWorkspace();
  const { channelId } = useParams<{ channelId?: string }>();
  const query = useChannel(workspaceId, channelId);
  const unavailable = useTrackConversation('channels', workspaceId, channelId, query, '/channels');

  if (!channelId) return <NoChannelSelected />;
  if (query.isPending) return <Page />;
  if (unavailable) return <ChannelUnavailable />;

  if (query.isError && !query.data) {
    return (
      <StatePage role="alert">
        <ContentStateIcon tone="danger">
          <WarningCircleIcon />
        </ContentStateIcon>
        <ContentStateTitle>Не вдалося завантажити канал</ContentStateTitle>
        <ContentStateActions>
          <Button onClick={() => void query.refetch()}>Спробувати ще раз</Button>
        </ContentStateActions>
      </StatePage>
    );
  }

  const channel = query.data;
  if (!channel) return <ChannelUnavailable />;

  return (
    <Page>
      <ConversationProvider
        key={`${workspaceId}:${channel.id}`}
        scope={{
          workspaceId,
          channelId: channel.id,
          title: channel.name,
          composer: {
            ariaLabel: `Написати в #${channel.name}`,
            placeholder: `Написати в #${channel.name}`,
            mentionEveryone: true,
          },
        }}
      >
        <WorkspaceChannelPresence channelId={channel.id} />
        <ChannelDetail workspaceId={workspaceId} channel={channel} leading={<MobileMenuButton />} />
      </ConversationProvider>
      <PageAside>
        <ChannelMembersPanel workspaceId={workspaceId} channel={channel} />
      </PageAside>
    </Page>
  );
}
