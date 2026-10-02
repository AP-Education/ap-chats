import type { RefObject } from 'react';

import type { MessageHistoryItem } from '../../types';
import { MessageAttachments } from '../MessageAttachments/MessageAttachments';
import { useMessageActionScope } from './MessageActionScope';
import { MessageEditor } from './MessageEditor';
import { MessageReadContent } from './MessageReadContent';

interface MessageBodyProps {
  contentRef: RefObject<HTMLDivElement | null>;
  minHeight: number;
  onEdit: (item: MessageHistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
  onCloseEdit: () => void;
}

export function MessageBody({ contentRef, minHeight, onEdit, onCloseEdit }: MessageBodyProps) {
  const { editing, item, delivery } = useMessageActionScope();

  return (
    <>
      {editing ? (
        <MessageEditor item={item} minHeight={minHeight} onEdit={onEdit} onClose={onCloseEdit} />
      ) : (
        <MessageReadContent contentRef={contentRef} />
      )}
      <MessageAttachments
        attachments={item.message.attachments ?? []}
        messageId={item.message.id}
        available={!delivery || delivery === 'confirmed'}
      />
    </>
  );
}
