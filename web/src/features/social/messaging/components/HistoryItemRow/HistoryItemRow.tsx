import type { HistoryItem } from '../../types';
import { historyItemStrategies } from './registry';
import type { HistoryItemRenderContext } from './types';

interface HistoryItemRowProps extends HistoryItemRenderContext {
  item: HistoryItem;
}

// Pure dispatch: looks up the strategy for this item's kind and renders it.
// Carries no knowledge of what a message or a call actually is.
export function HistoryItemRow({ item, ...context }: HistoryItemRowProps) {
  return <>{historyItemStrategies[item.type].render(item, context)}</>;
}
