import { Empty, Grid, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { ChannelDetail } from '@/features/communities/channels/components/ChannelDetail';
import { useChannel } from '@/features/communities/channels/hooks/useChannels';
import { ChannelMembersPanel } from '@/features/communities/memberships/components/ChannelMembersPanel';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import { useMobileMenu } from '@/layouts/MainLayout/stores/mobile-menu-context';
import { ChatLayout } from '@/shared/ui/ChatLayout/ChatLayout';

const useStyles = createStyles(({ token, css }) => ({
  centered: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: ${token.paddingLG}px;
  `,
}));

// Composition root for /channels — resolves the active workspace and the
// routed channel, then wires ChannelDetail/ChannelMembersPanel onto
// ChatLayout's children/aside slots. The channel list itself lives in
// MainSider, always on screen; on mobile it's the nav drawer, which the back
// arrow in the channel header reopens.
export default function ChannelsPage() {
  const { styles } = useStyles();
  const { channelId } = useParams<{ channelId?: string }>();
  const openMobileMenu = useMobileMenu().open;
  const { workspace, workspaces, isLoading: workspacesLoading } = useActiveWorkspace();
  const channelQuery = useChannel(workspace?.id, channelId);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [membersVisible, setMembersVisible] = useState<boolean | null>(null);
  const isMembersVisible = membersVisible ?? !isMobile;

  if (workspacesLoading) {
    return (
      <div className={styles.centered}>
        <Spin size="large" />
      </div>
    );
  }

  if (!workspace || !workspaces?.length) {
    return (
      <div className={styles.centered}>
        <Empty description="Спершу створіть робочий простір угорі. Тоді тут з’являться його канали." />
      </div>
    );
  }

  const channel = channelQuery.data;

  return (
    <ChatLayout
      asideOpen={isMembersVisible}
      onCloseAside={() => setMembersVisible(false)}
      aside={
        channel ? <ChannelMembersPanel workspaceId={workspace.id} channel={channel} /> : undefined
      }
    >
      {!channelId ? (
        <div className={styles.centered}>
          <Empty description="Оберіть канал зі списку" />
        </div>
      ) : channelQuery.isLoading ? (
        <div className={styles.centered}>
          <Spin size="large" />
        </div>
      ) : !channel ? (
        <div className={styles.centered}>
          <Empty description="Канал недоступний або більше не існує" />
        </div>
      ) : (
        <ChannelDetail
          workspaceId={workspace.id}
          channel={channel}
          membersVisible={isMembersVisible}
          onToggleMembers={() => setMembersVisible(!isMembersVisible)}
          onBack={isMobile ? openMobileMenu : undefined}
        />
      )}
    </ChatLayout>
  );
}
