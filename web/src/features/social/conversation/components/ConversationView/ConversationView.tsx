import { createStyles } from 'antd-style';
import { type ReactNode, useMemo } from 'react';

import { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import { PinnedMessageBar } from '@/features/social/pins/components/PinnedMessageBar/PinnedMessageBar';
import type { WorkspaceMember } from '@/features/workspaces/types';

import { useConversationScope } from '../../store';
import { ConversationFooter } from './ConversationFooter';
import { ConversationForwarding } from './ConversationForwarding';
import { ConversationHistoryContent } from './ConversationHistoryContent';
import { useConversationActions } from './useConversationActions';
import { useConversationHistoryNavigation } from './useConversationHistoryNavigation';

const useStyles = createStyles(({ css }) => ({
  shell: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  `,
}));

interface ConversationViewProps {
  canPost: boolean;
  canManage: boolean;
  canPin?: boolean;
  currentMember: WorkspaceMember | undefined;
  readOnlyFooter?: ReactNode;
}

export function ConversationView({
  canPost,
  canManage,
  canPin = canManage,
  currentMember,
  readOnlyFooter,
}: ConversationViewProps) {
  const { styles } = useStyles();
  const { workspaceId, channelId } = useConversationScope();
  const navigation = useConversationHistoryNavigation(canPost);
  const author = useMemo(
    () => ({
      memberId: currentMember?.id ?? '',
      displayName: currentMember?.profile.displayName ?? null,
      avatarPath: currentMember?.profile.avatarPath ?? null,
    }),
    [currentMember?.id, currentMember?.profile.displayName, currentMember?.profile.avatarPath],
  );
  const operations = useMessageOperations(workspaceId, channelId, author, navigation.items);
  const interaction = useConversationActions({
    items: navigation.items,
    memberId: currentMember?.id,
    canManage,
    canPin,
    canPost,
    operations,
  });
  const historyReady =
    !navigation.history.isPending && !(navigation.history.isError && !navigation.history.data);

  return (
    <div className={styles.shell}>
      <PinnedMessageBar canUnpin={canPin && canPost} onJump={navigation.onJump} />
      <ConversationHistoryContent
        navigation={navigation}
        interaction={interaction}
        operations={operations}
      />
      <ConversationFooter
        canPost={canPost}
        historyReady={historyReady}
        readOnlyFooter={readOnlyFooter}
        items={navigation.items}
        send={operations.send}
      />
      <ConversationForwarding
        items={interaction.forwardItems}
        historyReady={historyReady}
        onClose={interaction.closeForward}
      />
    </div>
  );
}
