import { MessageRow } from '../../MessageRow/MessageRow';
import type { HistoryItemStrategy } from '../types';

export const messageEntryStrategy: HistoryItemStrategy = {
  render(item, context) {
    if (item.type !== 'MESSAGE') return null;
    return (
      <MessageRow
        item={item}
        grouped={context.grouped}
        actionContext={context.actionContext}
        actions={context.actions}
        onAction={context.onAction}
        onJump={context.onJump}
        onEdit={context.onEdit}
        delivery={context.delivery}
        onRetry={context.onRetry}
      />
    );
  },
};
