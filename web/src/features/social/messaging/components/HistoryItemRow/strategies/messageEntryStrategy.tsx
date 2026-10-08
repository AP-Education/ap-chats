import { MessageRow } from '../../MessageRow/MessageRow';
import type { HistoryItemStrategy } from '../types';

export const messageEntryStrategy: HistoryItemStrategy = {
  render(item, context) {
    if (item.type !== 'MESSAGE') return null;
    return (
      <MessageRow
        item={item}
        actionContext={context.actionContext}
        actions={context.actions}
        onAction={context.onAction}
        onJump={context.onJump}
        onEdit={context.onEdit}
        delivery={context.delivery}
        pendingAttachments={context.pendingAttachments}
        onRetry={context.onRetry}
      />
    );
  },
};
