import type { ReactNode } from 'react';

import type { HistoryItem } from '../messaging/types';

export type ActionTarget =
  | { kind: 'message'; items: [HistoryItem] }
  | { kind: 'text'; items: [HistoryItem]; selectedText: string }
  | { kind: 'batch'; items: HistoryItem[] };

export interface ActionContext {
  memberId: string | undefined;
  canManage: boolean;
  canPost: boolean;
}

export interface ActionCommands {
  reply: (item: HistoryItem, quoteText?: string) => void;
  edit: (item: HistoryItem) => void;
  remove: (items: HistoryItem[]) => void;
  select: (item: HistoryItem) => void;
  copy: (items: HistoryItem[], selectedText?: string) => void;
  forward: (items: HistoryItem[]) => void;
  pin: (item: HistoryItem, active: boolean) => void;
}

export interface ConversationAction {
  id: string;
  icon: ReactNode;
  label: (target: ActionTarget) => string;
  available: (target: ActionTarget, context: ActionContext) => boolean;
  execute: (target: ActionTarget, commands: ActionCommands) => void;
}
