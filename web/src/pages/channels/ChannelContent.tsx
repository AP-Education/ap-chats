import { Button, Empty, Result } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { ChatLayout } from '@/domain/conversation/ChatLayout';
import { ChatLoading } from '@/domain/conversation/ChatLoading';
import { ChannelDetail } from '@/features/communities/channels/components/ChannelDetail';
import { useChannel } from '@/features/communities/channels/hooks/useChannels';
import { ChannelMembersPanel } from '@/features/communities/memberships/components/ChannelMembersPanel';
import { ConversationProvider } from '@/features/social/conversation/store';
import { useTrackConversation } from '@/features/social/conversation/useTrackConversation';
import { useRequiredWorkspace } from '@/features/workspaces/stores/required-workspace-context';
import { MainSiderMenu } from '@/layouts/MainLayout/MainSiderMenu';
import { useMobileMenu } from '@/layouts/MainLayout/stores/mobile-menu-context';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useIsNarrowLayout } from '@/shared/hooks/useIsNarrowLayout';

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
  const openMobileMenu = useMobileMenu().open;
  const isMobile = useIsMobile();
  const isNarrowLayout = useIsNarrowLayout();
  const [membersVisible, setMembersVisible] = useState<boolean | null>(null);
  const isMembersVisible = membersVisible ?? !isNarrowLayout;

  if (!channelId) {
    if (isMobile) return <MainSiderMenu />;

    return (
      <div className={styles.centered}>
        <Empty description="Оберіть канал зі списку" />
      </div>
    );
  }

  if (query.isPending) return <ChatLoading asideOpen={isMembersVisible} />;

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
    <ChatLayout
      asideOpen={isMembersVisible}
      onCloseAside={() => setMembersVisible(false)}
      aside={
        <ChannelMembersPanel
          workspaceId={workspaceId}
          channel={channel}
          onClose={() => setMembersVisible(false)}
        />
      }
    >
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
        <ChannelDetail
          workspaceId={workspaceId}
          channel={channel}
          membersVisible={isMembersVisible}
          onToggleMembers={() => setMembersVisible(!isMembersVisible)}
          onBack={isMobile ? openMobileMenu : undefined}
        />
      </ConversationProvider>
    </ChatLayout>
  );
}
