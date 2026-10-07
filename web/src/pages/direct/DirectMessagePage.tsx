import { Page, PageActions, PageAside, PageBody, PageHeader, PageTitle, useIsMobile } from '@ap/ui';
import { Button, Empty, Result } from 'antd';
import { createStyles } from 'antd-style';
import { useParams } from 'react-router-dom';

import { ChatLoading } from '@/domain/conversation/ChatLoading';
import { ConversationView } from '@/features/social/conversation/components/ConversationView/ConversationView';
import { ConversationProvider } from '@/features/social/conversation/store';
import { useTrackConversation } from '@/features/social/conversation/useTrackConversation';
import { DirectMessageActions } from '@/features/social/direct-messages/components/DirectMessageActions';
import { DirectProfilePanel } from '@/features/social/direct-messages/components/DirectProfilePanel/DirectProfilePanel';
import { useDirectMessage } from '@/features/social/direct-messages/hooks/useDirectMessages';
import { WorkspaceChannelPresence } from '@/features/social/read-state/WorkspaceChannelPresence';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import { useRequiredWorkspace } from '@/features/workspaces/stores/required-workspace-context';
import { MobileMenuButton } from '@/layouts/chats/MobileMenuButton';
import { Avatar } from '@/shared/ui/Avatar';

const useStyles = createStyles(({ css }) => ({
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
      <Page>
        <PageHeader>
          <MobileMenuButton />
          <PageTitle>Особисті</PageTitle>
        </PageHeader>
        <PageBody>
          <div className={styles.center}>
            <Empty description="Оберіть розмову або напишіть колезі" />
          </div>
        </PageBody>
      </Page>
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
    <Page>
      <ConversationProvider
        key={`${workspaceId}:${channelId}`}
        scope={{
          workspaceId,
          channelId,
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
        <PageHeader>
          <MobileMenuButton />
          <PageTitle>
            <Avatar path={participant.avatarPath} alt={name} size={40} shape="circle" />
            <span className={styles.name}>{name}</span>
          </PageTitle>
          <PageActions>
            <DirectMessageActions workspaceId={workspaceId} conversation={conversation.data} />
          </PageActions>
        </PageHeader>
        <PageBody>
          <ConversationView
            canPost={participant.active}
            canManage={false}
            canPin={participant.active}
            currentMember={currentMember}
          />
        </PageBody>
      </ConversationProvider>
      <PageAside>
        <DirectProfilePanel
          participant={participant}
          member={byId.get(participant.memberId)?.member}
        />
      </PageAside>
    </Page>
  );
}
