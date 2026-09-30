import type { ReactNode } from 'react';

import type { MessageHistoryItem } from '../messaging/types';

export type ActionTarget =
  | { kind: 'message'; items: [MessageHistoryItem] }
  | { kind: 'text'; items: [MessageHistoryItem]; selectedText: string }
  | { kind: 'batch'; items: MessageHistoryItem[] };

export interface ActionContext {
  memberId: string | undefined;
  canManage: boolean;
  canPin: boolean;
  canPost: boolean;
}

export interface ActionCommands {
  reply: (item: MessageHistoryItem, quoteText?: string) => void;
  edit: (item: MessageHistoryItem) => void;
  remove: (items: MessageHistoryItem[]) => void;
  select: (item: MessageHistoryItem) => void;
  copy: (items: MessageHistoryItem[], selectedText?: string) => void;
  forward: (items: MessageHistoryItem[]) => void;
  pin: (item: MessageHistoryItem, active: boolean) => void;
}

export interface ConversationAction {
  id: string;
  icon: ReactNode;
  label: (target: ActionTarget) => string;
  available: (target: ActionTarget, context: ActionContext) => boolean;
  execute: (target: ActionTarget, commands: ActionCommands) => void;
}
