import { CallLogRow } from '../../CallLogRow/CallLogRow';
import type { HistoryItemStrategy } from '../types';

export const callEntryStrategy: HistoryItemStrategy = {
  render(item, context) {
    if (item.type !== 'CALL') return null;
    return <CallLogRow item={item} viewerMemberId={context.actionContext.memberId} />;
  },
};
