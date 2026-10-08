import type { RefObject } from 'react';

import { MentionEditor } from '@/features/social/mentions/components/MentionEditor/MentionEditor';

import type { MessageHistoryItem } from '../../types';
import { MessageAttachments } from '../MessageAttachments/MessageAttachments';
import { PendingAttachments } from '../MessageAttachments/PendingAttachments';
import type { BubbleLayout } from './bubbleLayout';
import { useMessageActionScope } from './MessageActionScope';
import { MessageEditor } from './MessageEditor';
import { MessageMeta } from './MessageMeta';
import { MessageReadContent } from './MessageReadContent';

interface MessageBodyProps {
  layout: BubbleLayout;
  contentRef: RefObject<HTMLDivElement | null>;
  minHeight: number;
  onEdit: (item: MessageHistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
  onCloseEdit: () => void;
}

// Attachments come first and the caption last, so the time can close the caption's last line.
export function MessageBody({
  layout,
  contentRef,
  minHeight,
  onEdit,
  onCloseEdit,
}: MessageBodyProps) {
  const { editing, item, delivery, pendingAttachments } = useMessageActionScope();
  const textMeta = (layout.meta === 'inline' || layout.meta === 'emoji') && (
    <MessageMeta placement={layout.meta} />
  );

  return (
    <>
      {pendingAttachments ? (
        <PendingAttachments drafts={pendingAttachments} />
      ) : (
        <MessageAttachments
          attachments={item.message.attachments ?? []}
          messageId={item.message.id}
          available={!delivery || delivery === 'confirmed'}
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
      {(layout.meta === 'block' || layout.meta === 'overlay') && (
        <MessageMeta placement={layout.meta} />
      )}
    </>
  );
}
