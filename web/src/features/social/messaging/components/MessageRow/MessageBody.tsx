import type { RefObject } from 'react';

import { MentionEditor } from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { MessageReactions } from '@/features/social/reactions/components/MessageReactions/MessageReactions';
import { starMeMessageBlocks } from '@/features/star-me/message-blocks';

import { useTimelineActions } from '../../timeline-actions-context';
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
  onCloseEdit: () => void;
}

// Attachments come first and the caption after them, so the time can close its last line; blocks
// like a GIF go under the text, as on Discord.
export function MessageBody({ layout, contentRef, onCloseEdit }: MessageBodyProps) {
  const { editing, item, delivery, pendingAttachments, canReact, context } =
    useMessageActionScope();
  const { saveEdit } = useTimelineActions();
  const textMeta = (layout.meta === 'inline' || layout.meta === 'emoji') && (
    <MessageMeta placement={layout.meta} />
  );
  const allBlocks = starMeMessageBlocks(item.message);
  const blocks = allBlocks.filter((block) => block.type !== 'voice');
  const assistantBlock = blocks.find((block) => block.type === 'star-me');
  const mediaBlocks = blocks.filter((block) => block.type !== 'star-me');
  // On media the time sits on whatever closes the bubble, in its colours: a GIF, else the photos.
  const mediaMeta = layout.meta === 'overlay' && <MessageMeta placement="overlay" />;
  const blocksClose = mediaBlocks.length > 0;
  const voiceMeta = layout.meta === 'voice' && <MessageMeta placement="voice" />;

  return (
    <>
      {pendingAttachments ? (
        <PendingAttachments
          rowId={item.id}
          drafts={pendingAttachments}
          blocks={allBlocks}
          meta={voiceMeta}
        />
      ) : (
        <MessageAttachments
          attachments={item.message.attachments ?? []}
          messageId={item.message.id}
          available={!delivery}
          overlay={!blocksClose && mediaMeta}
          footer={voiceMeta}
        />
      )}
      {editing && (
        <MessageEditor item={item} onEdit={saveEdit} onClose={onCloseEdit}>
          <MentionEditor />
        </MessageEditor>
      )}
      {!editing && layout.hasText && !assistantBlock && (
        <MessageReadContent
          contentRef={contentRef}
          jumboEmoji={layout.jumboEmoji}
          meta={textMeta}
        />
      )}
      {!editing && assistantBlock && (
        <MessageBlocks
          blocks={[assistantBlock]}
          messageId={item.message.id}
          contentRef={contentRef}
          meta={textMeta}
        />
      )}
      <MessageBlocks
        blocks={mediaBlocks}
        messageId={item.message.id}
        meta={blocksClose && mediaMeta}
      />
      {layout.meta === 'block' && <MessageMeta placement="block" />}
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
