import type { ComponentType } from 'react';

import type { DisplayItem, HistoryItem } from '../../types';
import { CallLogRow } from '../CallLogRow/CallLogRow';
import { MessageRow } from '../MessageRow/MessageRow';

type EntryProps<Type extends HistoryItem['type']> = Omit<DisplayItem, 'item'> & {
  item: Extract<HistoryItem, { type: Type }>;
};

const entries: { [Type in HistoryItem['type']]: ComponentType<EntryProps<Type>> } = {
  MESSAGE: MessageRow,
  CALL: CallLogRow,
};

// A kind of entry this client does not know yet shows nothing rather than breaking the timeline.
export function HistoryEntry(display: DisplayItem) {
  // A lookup by `type` loses the link to the item's own type, which `entries` already enforces.
  const Entry = entries[display.item.type] as ComponentType<DisplayItem> | undefined;

  return Entry ? <Entry {...display} /> : null;
}
