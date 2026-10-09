import { createStyles } from 'antd-style';
import { type ReactNode, useMemo, useRef } from 'react';

import { ActiveCallBanner } from '@/features/calls/components/ActiveCallBanner';
import { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import { PinnedMessageBar } from '@/features/social/pins/components/PinnedMessageBar/PinnedMessageBar';
import { ChatWallpaperSurface } from '@/features/social/wallpaper/components/ChatWallpaperSurface';
import type { WorkspaceMember } from '@/features/workspaces/types';

import { useConversationScope } from '../../store';
import { ConversationFooter } from './ConversationFooter';
import { ConversationForwarding } from './ConversationForwarding';
import { ConversationHistoryContent } from './ConversationHistoryContent';
import { ConversationSelectionBar } from './ConversationSelectionBar';
import { useConversationActions } from './useConversationActions';
import { useConversationHistoryNavigation } from './useConversationHistoryNavigation';
import { useKeyboardGlide } from './useKeyboardGlide';
import { useOverlayInsets } from './useOverlayInsets';

const useStyles = createStyles(({ css }) => ({
  shell: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  `,
  top: css`
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 2;
  `,
  // Clicks through the transparent space around the composer reach the messages behind it.
  bottom: css`
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 2;
    pointer-events: none;
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
  const { workspaceId, channelId, title, avatarPath } = useConversationScope();
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
  const surfaceRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  useOverlayInsets(surfaceRef, topRef, bottomRef);
  useKeyboardGlide(surfaceRef);

  return (
    <ChatWallpaperSurface ref={surfaceRef} className={styles.shell} data-conversation-drop-target>
      <ConversationHistoryContent
        navigation={navigation}
        interaction={interaction}
        operations={operations}
      />
      <div ref={topRef} className={styles.top}>
        <PinnedMessageBar canUnpin={canPin && canPost} onJump={navigation.onJump} />
        <ActiveCallBanner
          workspaceId={workspaceId}
          channelId={channelId}
          title={title}
          calleeAvatarPath={avatarPath}
        />
      </div>
      <div ref={bottomRef} className={styles.bottom} data-keyboard-glide>
        {historyReady && <ConversationSelectionBar interaction={interaction} />}
        {/* Hidden rather than unmounted while selecting, so a draft and its uploads live on. */}
        <div hidden={interaction.selectedItems.length > 0}>
          <ConversationFooter
            canPost={canPost}
            readOnlyFooter={readOnlyFooter}
            items={navigation.items}
            send={operations.send}
          />
        </div>
      </div>
      <ConversationForwarding
        items={interaction.forwardItems}
        historyReady={historyReady}
        onClose={interaction.closeForward}
      />
    </ChatWallpaperSurface>
  );
}
