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
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { ChannelDetail } from '@/features/communities/channels/components/ChannelDetail';
import { useChannel } from '@/features/communities/channels/hooks/useChannels';
import { ChannelMembersPanel } from '@/features/communities/memberships/components/ChannelMembersPanel';
import { useTrackConversation } from '@/features/social/conversation/useTrackConversation';
import { ConversationProvider } from '@/features/social/conversation-scope/store';
import { WorkspaceChannelPresence } from '@/features/social/read-state/WorkspaceChannelPresence';
import { schedulingExtension } from '@/features/social/scheduling/extension';
import { useStarMeExtension } from '@/features/star-me/hooks/useStarMeExtension';
import { useRequiredWorkspace } from '@/features/workspaces/stores/required-workspace-context';
import { MobileMenuButton } from '@/layouts/chats/MobileMenuButton';
import { RefreshOnPull } from '@/shared/ui/PullToRefresh/RefreshOnPull';

/** On mobile the page keeps its header, so the menu with the channel list stays one tap away. */
function NoChannelSelected() {
  const { t } = useTranslation('communities');
  const isMobile = useIsMobile();

  return (
    <Page>
      {isMobile && (
        <PageHeader>
          <MobileMenuButton />
          <PageTitle>{t(($) => $.channels.page.title)}</PageTitle>
        </PageHeader>
      )}
      <PageBody>
        <RefreshOnPull>
          <ContentState>
            <ContentStateIcon>
              <ChatsIcon />
            </ContentStateIcon>
            <ContentStateTitle>{t(($) => $.channels.page.pickChannel)}</ContentStateTitle>
          </ContentState>
        </RefreshOnPull>
      </PageBody>
    </Page>
  );
}

function ChannelUnavailable() {
  const { t } = useTranslation('communities');

  return (
    <StatePage>
      <ContentStateIcon>
        <ProhibitIcon />
      </ContentStateIcon>
      <ContentStateTitle>{t(($) => $.channels.page.unavailableTitle)}</ContentStateTitle>
      <ContentStateDescription>
        {t(($) => $.channels.page.unavailableDescription)}
      </ContentStateDescription>
    </StatePage>
  );
}

export default function ChannelContent() {
  const { t } = useTranslation(['communities', 'common']);
  const { id: workspaceId } = useRequiredWorkspace();
  const { channelId } = useParams<{ channelId?: string }>();
  const query = useChannel(workspaceId, channelId);
  const unavailable = useTrackConversation('channels', workspaceId, channelId, query, '/channels');
  const starMe = useStarMeExtension(workspaceId);
  const extensions = useMemo(
    () => (starMe ? [starMe, schedulingExtension] : [schedulingExtension]),
    [starMe],
  );

  if (!channelId) return <NoChannelSelected />;
  if (query.isPending) return <Page />;
  if (unavailable) return <ChannelUnavailable />;

  if (query.isError && !query.data) {
    return (
      <StatePage role="alert">
        <ContentStateIcon tone="danger">
          <WarningCircleIcon />
        </ContentStateIcon>
        <ContentStateTitle>{t(($) => $.channels.page.loadFailed)}</ContentStateTitle>
        <ContentStateActions>
          <Button onClick={() => void query.refetch()}>
            {t(($) => $.common.actions.tryAgain)}
          </Button>
        </ContentStateActions>
      </StatePage>
    );
  }

  const channel = query.data;
  if (!channel) return <ChannelUnavailable />;

  const composerLabel = t(($) => $.channels.composer, { name: channel.name });

  return (
    <Page>
      <ConversationProvider
        key={`${workspaceId}:${channel.id}`}
        extensions={extensions}
        scope={{
          workspaceId,
          channelId: channel.id,
          title: channel.name,
          composer: {
            ariaLabel: composerLabel,
            placeholder: composerLabel,
            groupMentions: true,
          },
          permissions: {
            canPost: channel.canPost,
            canReact: channel.isMember,
            canManage: channel.canManage,
            // Pinning changes the channel, so it needs the right to post as well as to manage.
            canPin: channel.canManage && channel.canPost,
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
