import { Button, Empty, Result } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { ChatLayout } from '@/domain/conversation/ChatLayout';
import { ChatLoading } from '@/domain/conversation/ChatLoading';
import { ConversationPane } from '@/domain/conversation/ConversationPane';
import { ConversationView } from '@/features/social/conversation/components/ConversationView/ConversationView';
import { ConversationProvider } from '@/features/social/conversation/store';
import { useTrackConversation } from '@/features/social/conversation/useTrackConversation';
import { DirectMessageActions } from '@/features/social/direct-messages/components/DirectMessageActions';
import { DirectProfilePanel } from '@/features/social/direct-messages/components/DirectProfilePanel/DirectProfilePanel';
import { useDirectMessage } from '@/features/social/direct-messages/hooks/useDirectMessages';
import { WorkspaceChannelPresence } from '@/features/social/read-state/WorkspaceChannelPresence';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import { useRequiredWorkspace } from '@/features/workspaces/stores/required-workspace-context';
import { MobileMenuButton } from '@/layouts/MainLayout/MobileMenuButton';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useIsNarrowLayout } from '@/shared/hooks/useIsNarrowLayout';
import { Avatar } from '@/shared/ui/Avatar/Avatar';

const useStyles = createStyles(({ css }) => ({
  title: css`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  `,
  name: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  center: css`
    display: grid;
    place-content: center;
    height: 100%;
  `,
}));

export default function DirectMessagePage() {
  const { styles } = useStyles();
  const { id: workspaceId } = useRequiredWorkspace();
  const { channelId } = useParams<{ channelId: string }>();
  const isMobile = useIsMobile();
  const isNarrowLayout = useIsNarrowLayout();
  const [profileVisible, setProfileVisible] = useState<boolean | null>(null);
  const isProfileVisible = profileVisible ?? !isNarrowLayout;
  const conversation = useDirectMessage(workspaceId, channelId);
  const unavailable = useTrackConversation(
    'direct',
    workspaceId,
    channelId,
    conversation,
    '/direct',
  );
  const { byId, currentMember } = useWorkspaceMemberLabels(workspaceId);

  if (!channelId && isMobile) {
    return (
      <ConversationPane
        title={
          <>
            <MobileMenuButton />
            Особисті
          </>
        }
      >
        <div className={styles.center}>
          <Empty description="Оберіть розмову або напишіть колезі" />
        </div>
      </ConversationPane>
    );
  }
  if (!channelId) {
    return (
      <div className={styles.center}>
        <Empty description="Оберіть розмову або напишіть колезі" />
      </div>
    );
  }
  if (conversation.isPending) return <ChatLoading />;
  if (unavailable) {
    return (
      <div className={styles.center}>
        <Empty description="Розмова недоступна" />
      </div>
    );
  }
  if (conversation.isError || !conversation.data) {
    return (
      <Result
        status="error"
        title="Не вдалося відкрити розмову"
        extra={<Button onClick={() => void conversation.refetch()}>Повторити</Button>}
      />
    );
  }

  const { participant } = conversation.data;
  const name = participant.displayName ?? 'Ім’я недоступне';
  return (
    <ChatLayout
      asideOpen={isProfileVisible}
      onCloseAside={() => setProfileVisible(false)}
      aside={
        <DirectProfilePanel
          participant={participant}
          member={byId.get(participant.memberId)?.member}
          onClose={() => setProfileVisible(false)}
        />
      }
    >
      <ConversationProvider
        key={`${workspaceId}:${channelId}`}
        scope={{
          workspaceId,
          channelId,
          kind: 'direct',
          title: name,
          avatarPath: participant.avatarPath,
          composer: {
            ariaLabel: `Написати ${name}`,
            placeholder: `Повідомлення для ${name}`,
            autoFocus: true,
          },
        }}
      >
        <WorkspaceChannelPresence channelId={channelId} />
        <ConversationPane
          title={
            <>
              <MobileMenuButton />
              <div className={styles.title}>
                <Avatar path={participant.avatarPath} alt={name} size={40} shape="circle" />
                <span className={styles.name}>{name}</span>
              </div>
            </>
          }
          actions={
            <DirectMessageActions
              workspaceId={workspaceId}
              conversation={conversation.data}
              profileVisible={isProfileVisible}
              onToggleProfile={() => setProfileVisible(!isProfileVisible)}
              compact={isMobile}
            />
          }
        >
          <ConversationView
            canPost={participant.active}
            canManage={false}
            canPin={participant.active}
            currentMember={currentMember}
          />
        </ConversationPane>
      </ConversationProvider>
    </ChatLayout>
  );
}
