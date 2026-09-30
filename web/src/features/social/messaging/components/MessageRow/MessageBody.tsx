import type { RefObject } from 'react';

import type { MessageHistoryItem } from '../../types';
import { useMessageActionScope } from './MessageActionScope';
import { MessageEditor } from './MessageEditor';
import { MessageReadContent } from './MessageReadContent';
import { MessageTouchActions } from './MessageTouchActions';

interface MessageBodyProps {
  contentRef: RefObject<HTMLDivElement | null>;
  minHeight: number;
  onEdit: (item: MessageHistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
  onCloseEdit: () => void;
}

export function MessageBody({ contentRef, minHeight, onEdit, onCloseEdit }: MessageBodyProps) {
  const { editing, item } = useMessageActionScope();

  if (editing) {
    return (
      <MessageEditor item={item} minHeight={minHeight} onEdit={onEdit} onClose={onCloseEdit} />
    );
  }

  return (
    <MessageTouchActions>
      <MessageReadContent contentRef={contentRef} />
    </MessageTouchActions>
  );
}
