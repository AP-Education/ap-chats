import {
  ContentState,
  ContentStateActions,
  ContentStateIcon,
  ContentStateTitle,
  Page,
  PageActions,
  PageAside,
  PageBody,
  PageHeader,
  PageTitle,
  StatePage,
  useIsMobile,
} from '@ap-education/ui';
import { ChatTextIcon, ProhibitIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useParams } from 'react-router-dom';

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
}));

/** On mobile the page keeps its header, so the menu with the conversations stays one tap away. */
function NoConversationSelected() {
  const isMobile = useIsMobile();

  return (
    <Page>
      {isMobile && (
        <PageHeader>
          <MobileMenuButton />
          <PageTitle>Особисті</PageTitle>
        </PageHeader>
      )}
      <PageBody>
        <ContentState>
          <ContentStateIcon>
            <ChatTextIcon />
          </ContentStateIcon>
          <ContentStateTitle>Оберіть розмову або напишіть колезі</ContentStateTitle>
        </ContentState>
      </PageBody>
    </Page>
  );
}

export default function DirectMessagePage() {
  const { styles } = useStyles();
  const { id: activeWorkspaceId } = useRequiredWorkspace();
  const { channelId } = useParams<{ channelId: string }>();
  const conversation = useDirectMessage(channelId);
  const unavailable = useTrackConversation(
    'direct',
    activeWorkspaceId,
    channelId,
    conversation,
    '/direct',
  );
  // A conversation belongs to people rather than to the active workspace, so it names its own.
  const { byId, currentMember } = useWorkspaceMemberLabels(conversation.data?.workspaceId);

  if (!channelId) return <NoConversationSelected />;
  if (conversation.isPending) return <Page />;

  if (unavailable) {
    return (
      <StatePage>
        <ContentStateIcon>
          <ProhibitIcon />
        </ContentStateIcon>
        <ContentStateTitle>Розмова недоступна</ContentStateTitle>
      </StatePage>
    );
  }

  if (conversation.isError || !conversation.data) {
    return (
      <StatePage role="alert">
        <ContentStateIcon tone="danger">
          <WarningCircleIcon />
        </ContentStateIcon>
        <ContentStateTitle>Не вдалося відкрити розмову</ContentStateTitle>
        <ContentStateActions>
          <Button onClick={() => void conversation.refetch()}>Повторити</Button>
        </ContentStateActions>
      </StatePage>
    );
  }

  const { participant, workspaceId } = conversation.data;
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
        <PageBody transparent>
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
