import { ArrowLeftIcon } from '@phosphor-icons/react';
import { Button, Empty, Result } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { ConversationView } from '@/features/social/conversation/components/ConversationView/ConversationView';
import {
  forgetConversation,
  rememberConversation,
} from '@/features/social/conversation/lastConversation';
import { ConversationProvider } from '@/features/social/conversation/store';
import { DirectMessageList } from '@/features/social/direct-messages/components/DirectMessageList/DirectMessageList';
import { useDirectMessage } from '@/features/social/direct-messages/hooks/useDirectMessages';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import { useRequiredWorkspace } from '@/features/workspaces/stores/required-workspace-context';
import { ApiError } from '@/shared/api/http';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { Avatar } from '@/shared/ui/Avatar/Avatar';
import { ChatLayout } from '@/shared/ui/ChatLayout/ChatLayout';
import { ChatLoading } from '@/shared/ui/ChatLayout/ChatLoading';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 10px;
    height: 60px;
    padding: 0 20px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    font-weight: 650;
  `,
  back: css`
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    color: ${token.colorText};
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
  const { identity } = useQueryAuth();
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId: string }>();
  const isMobile = useIsMobile();
  const conversation = useDirectMessage(workspaceId, channelId);
  const unavailable =
    conversation.isError &&
    conversation.error instanceof ApiError &&
    [403, 404].includes(conversation.error.status);
  useEffect(() => {
    if (conversation.data && !conversation.isError) {
      rememberConversation(identity, workspaceId, 'direct', conversation.data.id);
    }
  }, [conversation.data, conversation.isError, identity, workspaceId]);
  useEffect(() => {
    if (
      channelId &&
      unavailable &&
      forgetConversation(identity, workspaceId, 'direct', channelId)
    ) {
      navigate('/direct', { replace: true });
    }
  }, [channelId, identity, navigate, unavailable, workspaceId]);
  const { currentMember } = useWorkspaceMemberLabels(workspaceId);

  if (!channelId && isMobile) return <DirectMessageList workspaceId={workspaceId} />;
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
    <ChatLayout>
      <ConversationProvider
        key={`${workspaceId}:${channelId}`}
        scope={{
          workspaceId,
          channelId,
          composer: {
            ariaLabel: `Написати ${name}`,
            placeholder: `Повідомлення для ${name}`,
            autoFocus: true,
          },
        }}
      >
        <div className={styles.shell}>
          <div className={styles.header}>
            {isMobile && (
              <Link to="/direct?list=1" className={styles.back} aria-label="Назад до розмов">
                <ArrowLeftIcon size={20} />
              </Link>
            )}
            <Avatar path={participant.avatarPath} alt={name} size={32} shape="circle" />
            <span>{name}</span>
          </div>
          <ConversationView
            canPost={participant.active}
            canManage={false}
            currentMember={currentMember}
          />
        </div>
      </ConversationProvider>
    </ChatLayout>
  );
}
