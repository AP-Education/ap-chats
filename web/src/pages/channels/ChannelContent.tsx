import { Page, PageAside, PageBody, PageHeader, PageTitle, useIsMobile } from '@ap-education/ui';
import { Button, Empty, Result } from 'antd';
import { createStyles } from 'antd-style';
import { useParams } from 'react-router-dom';

import { ChatLoading } from '@/domain/conversation/ChatLoading';
import { ChannelDetail } from '@/features/communities/channels/components/ChannelDetail';
import { useChannel } from '@/features/communities/channels/hooks/useChannels';
import { ChannelMembersPanel } from '@/features/communities/memberships/components/ChannelMembersPanel';
import { ConversationProvider } from '@/features/social/conversation/store';
import { useTrackConversation } from '@/features/social/conversation/useTrackConversation';
import { WorkspaceChannelPresence } from '@/features/social/read-state/WorkspaceChannelPresence';
import { useRequiredWorkspace } from '@/features/workspaces/stores/required-workspace-context';
import { MobileMenuButton } from '@/layouts/chats/MobileMenuButton';

const useStyles = createStyles(({ token, css }) => ({
  centered: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: ${token.paddingLG}px;
  `,
}));

export default function ChannelContent() {
  const { styles } = useStyles();
  const { id: workspaceId } = useRequiredWorkspace();
  const { channelId } = useParams<{ channelId?: string }>();
  const query = useChannel(workspaceId, channelId);
  const unavailable = useTrackConversation('channels', workspaceId, channelId, query, '/channels');
  const isMobile = useIsMobile();

  if (!channelId) {
    if (isMobile) {
      return (
        <Page>
          <PageHeader>
            <MobileMenuButton />
            <PageTitle>Чати</PageTitle>
          </PageHeader>
          <PageBody>
            <div className={styles.centered}>
              <Empty description="Оберіть канал зі списку" />
            </div>
          </PageBody>
        </Page>
      );
    }

    return (
      <div className={styles.centered}>
        <Empty description="Оберіть канал зі списку" />
      </div>
    );
  }

  if (query.isPending) return <ChatLoading />;

  if (unavailable) {
    return (
      <div className={styles.centered}>
        <Empty description="Канал недоступний або більше не існує" />
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <Result
        status="error"
        title="Не вдалося завантажити канал"
        extra={<Button onClick={() => void query.refetch()}>Спробувати ще раз</Button>}
      />
    );
  }

  const channel = query.data;
  if (!channel) {
    return (
      <div className={styles.centered}>
        <Empty description="Канал недоступний або більше не існує" />
      </div>
    );
  }

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
