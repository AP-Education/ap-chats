import { Button, Empty, Result } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { ChannelDetail } from '@/features/communities/channels/components/ChannelDetail';
import { useChannel } from '@/features/communities/channels/hooks/useChannels';
import { ChannelMembersPanel } from '@/features/communities/memberships/components/ChannelMembersPanel';
import { useRequiredWorkspace } from '@/features/workspaces/stores/required-workspace-context';
import { useMobileMenu } from '@/layouts/MainLayout/stores/mobile-menu-context';
import { ApiError } from '@/shared/api/http';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { ChatLayout } from '@/shared/ui/ChatLayout/ChatLayout';
import { ChatLoading } from '@/shared/ui/ChatLayout/ChatLoading';

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
  const openMobileMenu = useMobileMenu().open;
  const isMobile = useIsMobile();
  const [membersVisible, setMembersVisible] = useState<boolean | null>(null);
  const isMembersVisible = membersVisible ?? !isMobile;

  if (!channelId) {
    return (
      <div className={styles.centered}>
        <Empty description="Оберіть канал зі списку" />
      </div>
    );
  }

  if (query.isPending) return <ChatLoading asideOpen={isMembersVisible} />;

  if (query.isError && query.error instanceof ApiError && [403, 404].includes(query.error.status)) {
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
      aside={<ChannelMembersPanel workspaceId={workspaceId} channel={channel} />}
    >
      <ChannelDetail
        workspaceId={workspaceId}
        channel={channel}
        membersVisible={isMembersVisible}
        onToggleMembers={() => setMembersVisible(!isMembersVisible)}
        onBack={isMobile ? openMobileMenu : undefined}
      />
    </ChatLayout>
  );
}
