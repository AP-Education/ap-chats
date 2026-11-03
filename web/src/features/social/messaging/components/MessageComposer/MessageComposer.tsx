import {
  Composer,
  type ComposerDraft,
  ComposerField,
  ComposerHeader,
} from '@ap-education/timeline/composer';
import { type ReactNode, useMemo, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import { useAttachments } from '../../attachments/useAttachments';
import { useLinkedGif } from '../../gifs/useLinkedGif';
import type { ComposedMessage } from '../../types';
import { useAttachmentDrop } from './AttachmentDropZone';
import { AttachFiles, ComposerAttachments } from './ComposerAttachments';
import { ComposerIntent } from './ComposerIntent';
import type { ReplyPreview } from './composerIntents';
import { MessageInput } from './MessageInput';
import { SendButton } from './SendButton';

interface MessageComposerProps {
  replyAuthor?: string;
  replyPreview?: ReplyPreview;
  /** `nonce` names the message, and the composer's files went out under it. */
  onSend: (input: ComposedMessage, nonce: string) => void;
  /** The editor to compose with, such as `<MentionEditor />`, wired by the composer around it. */
  children: ReactNode;
}

export function MessageComposer({
  replyAuthor,
  replyPreview,
  onSend,
  children,
}: MessageComposerProps) {
  const { workspaceId, channelId, composer } = useConversationScope();
  const { identity } = useQueryAuth();
  const draftKey = `ap-chats:draft:${identity}:${workspaceId}:${channelId}`;
  const labels = useMemo(
    () => ({ field: composer.ariaLabel, placeholder: composer.placeholder }),
    [composer.ariaLabel, composer.placeholder],
  );
  const uploads = useAttachments();
  const { bindTarget, overlay } = useAttachmentDrop(uploads.addFiles);
  const linkedGif = useLinkedGif();
  // Sends leave in the order written, though finding a GIF may hold one back for a moment.
  const sendQueue = useRef(Promise.resolve());

  function sendInTurn(nonce: string, prepare: () => Promise<ComposedMessage>) {
    sendQueue.current = sendQueue.current.then(async () => onSend(await prepare(), nonce));
  }

  function send(message: ComposedMessage, nonce: string) {
    sendInTurn(nonce, async () => {
      const blocks = await linkedGif.blocksFor(message.markdown);
      return blocks ? { ...message, blocks } : message;
    });
  }

  return (
    <Composer<ComposerDraft & ComposedMessage>
      ref={bindTarget}
      draftKey={draftKey}
      labels={labels}
      autoFocus={composer.autoFocus}
      // Finding a GIF for a link starts while the words are still being written.
      onChange={(draft) => linkedGif.prefetch(draft.markdown)}
      onSend={send}
    >
      {overlay}
      <AttachFiles uploads={uploads} placement="beside" />
      <ComposerField>
        <ComposerHeader>
          <ComposerAttachments uploads={uploads} />
          <ComposerIntent replyAuthor={replyAuthor} replyPreview={replyPreview} />
        </ComposerHeader>
        <AttachFiles uploads={uploads} placement="field" />
        <MessageInput sendInTurn={sendInTurn}>{children}</MessageInput>
      </ComposerField>
      <SendButton hasAttachments={uploads.drafts.length > 0} />
    </Composer>
  );
}
