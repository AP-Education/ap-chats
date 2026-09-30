import type { HistoryItem } from '../../types';
import { callEntryStrategy } from './strategies/callEntryStrategy';
import { messageEntryStrategy } from './strategies/messageEntryStrategy';
import type { HistoryItemStrategy } from './types';

// A new HistoryItem kind (e.g. SYSTEM_EVENT) is one new strategy file plus one
// line here — nothing else in the timeline changes.
export const historyItemStrategies: Record<HistoryItem['type'], HistoryItemStrategy> = {
  MESSAGE: messageEntryStrategy,
  CALL: callEntryStrategy,
};
