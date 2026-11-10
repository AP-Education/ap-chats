import { useMobileMenu } from '@ap-education/shell-sdk';
import { createStyles } from 'antd-style';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';

import { ActiveCallBanner } from '@/features/calls/components/ActiveCallBanner';
import { useConversation, useConversationScope } from '@/features/social/conversation-scope/store';
import { MediaViewerProvider } from '@/features/social/media-viewer/providers/MediaViewerProvider';
import { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import { keyboardGlidePart } from '@/features/social/messaging/keyboard-glide-part';
import { PinnedMessageBar } from '@/features/social/pins/components/PinnedMessageBar/PinnedMessageBar';
import { ReactorsDialog } from '@/features/social/reactions/components/ReactorsDialog/ReactorsDialog';
import { useReactionEvents } from '@/features/social/reactions/hooks/useReactionEvents';
import { useReadReceiptEvents } from '@/features/social/read-receipts/hooks/useReadReceiptEvents';
import type { WorkspaceMember } from '@/features/workspaces/types';

import { ConversationFooter } from './ConversationFooter';
import { ConversationForwarding } from './ConversationForwarding';
import { ConversationHistoryContent } from './ConversationHistoryContent';
import { ConversationSelectionBar } from './ConversationSelectionBar';
import { KeyboardGlideSurface } from './KeyboardGlideSurface';
import { useConversationActions } from './useConversationActions';
import { useConversationHistoryNavigation } from './useConversationHistoryNavigation';
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
  currentMember: WorkspaceMember | undefined;
  readOnlyFooter?: ReactNode;
}

export function ConversationView({ currentMember, readOnlyFooter }: ConversationViewProps) {
  const { styles, cx } = useStyles();
  const { workspaceId, channelId, title, avatarPath } = useConversationScope();
  const navigation = useConversationHistoryNavigation();
  const author = useMemo(
    () => ({
      memberId: currentMember?.id ?? '',
      displayName: currentMember?.profile.displayName ?? null,
      avatarPath: currentMember?.profile.avatarPath ?? null,
      isBot: false,
      // Unsent rows are the viewer's own, which never show a name to colour.
      roleColor: null,
    }),
    [currentMember?.id, currentMember?.profile.displayName, currentMember?.profile.avatarPath],
  );
  const operations = useMessageOperations(workspaceId, channelId, author, navigation.items);
  useReactionEvents(currentMember?.id);
  useReadReceiptEvents(currentMember?.id);
  const { isOpen: menuOpen } = useMobileMenu();
  const requestComposerBlur = useConversation((state) => state.requestComposerBlur);
  // The menu takes the screen, so the composer puts its keyboard or picker away, as a swipe does.
  useEffect(() => {
    if (menuOpen) requestComposerBlur();
  }, [menuOpen, requestComposerBlur]);
  const interaction = useConversationActions({
    items: navigation.items,
    memberId: currentMember?.id,
    operations,
  });
  const historyReady = navigation.history.isLoaded;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  useOverlayInsets(surfaceRef, topRef, bottomRef);

  return (
    <KeyboardGlideSurface
      surfaceRef={surfaceRef}
      className={styles.shell}
      data-conversation-drop-target
    >
      <MediaViewerProvider
        items={navigation.items}
        actions={{
          actions: interaction.actions,
          context: interaction.actionContext,
          run: interaction.onAction,
          showInChat: navigation.onJump,
        }}
      >
        <ConversationHistoryContent
          navigation={navigation}
          interaction={interaction}
          operations={operations}
        />
      </MediaViewerProvider>
      <div ref={topRef} className={styles.top}>
        <PinnedMessageBar onJump={navigation.onJump} />
        <ActiveCallBanner
          workspaceId={workspaceId}
          channelId={channelId}
          title={title}
          calleeAvatarPath={avatarPath}
        />
      </div>
      <div ref={bottomRef} className={cx(styles.bottom, keyboardGlidePart)}>
        {historyReady && <ConversationSelectionBar interaction={interaction} />}
        {/* Hidden rather than unmounted while selecting, so a draft and its uploads live on. */}
        <div hidden={interaction.selectedItems.length > 0}>
          <ConversationFooter
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
      {interaction.reactionsItem && (
        <ReactorsDialog item={interaction.reactionsItem} onClose={interaction.closeReactions} />
      )}
    </KeyboardGlideSurface>
  );
}
