import { createContext, useContext } from 'react';

import type { ActionContext, ActionTarget, ConversationAction, MessageHistoryItem } from './types';

/** What the conversation lets every row of its timeline do, the same for all of them. */
export interface TimelineActions {
  viewer: ActionContext;
  actions: ConversationAction[];
  run: (action: ConversationAction, target: ActionTarget) => void;
  jumpTo: (messageId: string) => void;
  saveEdit: (item: MessageHistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
}

export const TimelineActionsContext = createContext<TimelineActions | null>(null);

export function useTimelineActions(): TimelineActions {
  const value = useContext(TimelineActionsContext);
  if (!value) {
    throw new Error('useTimelineActions must be used within TimelineActionsContext.Provider');
  }
  return value;
}
