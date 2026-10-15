import type { RefObject } from 'react';

import { MentionEditor } from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { MessageReactions } from '@/features/social/reactions/components/MessageReactions/MessageReactions';

import type { EditMessage } from '../../types';
import { MessageAttachments } from '../MessageAttachments/MessageAttachments';
import { PendingAttachments } from '../MessageAttachments/PendingAttachments';
import { MessageBlocks } from '../MessageBlocks/MessageBlocks';
import type { BubbleLayout } from './bubbleLayout';
import { useMessageActionScope } from './MessageActionScope';
import { MessageEditor } from './MessageEditor';
import { MessageMeta } from './MessageMeta';
import { MessageReadContent } from './MessageReadContent';

interface MessageBodyProps {
  layout: BubbleLayout;
  contentRef: RefObject<HTMLDivElement | null>;
  minHeight: number;
  onEdit: EditMessage;
  onCloseEdit: () => void;
}

// Attachments come first and the caption after them, so the time can close its last line; blocks
// like a GIF go under the text, as on Discord.
export function MessageBody({
  layout,
  contentRef,
  minHeight,
  onEdit,
  onCloseEdit,
}: MessageBodyProps) {
  const { editing, item, delivery, pendingAttachments, canReact, context } =
    useMessageActionScope();
  const textMeta = (layout.meta === 'inline' || layout.meta === 'emoji') && (
    <MessageMeta placement={layout.meta} />
  );
  const blocks = item.message.blocks ?? [];
  // On a GIF the time sits inside it, in its colours; on photos it stays on the bubble.
  const mediaMeta = layout.meta === 'overlay' && <MessageMeta placement="overlay" />;
  const blocksClose = blocks.length > 0;

  return (
    <>
      {pendingAttachments ? (
        <PendingAttachments drafts={pendingAttachments} />
      ) : (
        <MessageAttachments
          attachments={item.message.attachments ?? []}
          messageId={item.message.id}
          available={!delivery}
        />
      )}
      {editing && (
        <MessageEditor item={item} minHeight={minHeight} onEdit={onEdit} onClose={onCloseEdit}>
          <MentionEditor />
        </MessageEditor>
      )}
      {!editing && layout.hasText && (
        <MessageReadContent
          contentRef={contentRef}
          jumboEmoji={layout.jumboEmoji}
          meta={textMeta}
        />
      )}
      <MessageBlocks blocks={blocks} overlay={blocksClose && mediaMeta} />
      {(layout.meta === 'block' || (layout.meta === 'overlay' && !blocksClose)) && (
        <MessageMeta placement={layout.meta} />
      )}
      {layout.reactions && (
        <MessageReactions
          item={item}
          viewerMemberId={context.memberId}
          canReact={canReact}
          meta={layout.meta === 'reactions' && <MessageMeta placement="reactions" />}
        />
      )}
    </>
  );
}
