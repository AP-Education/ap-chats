import { SmileyIcon } from '@phosphor-icons/react';

import type { ConversationAction } from '../conversation/actions';
import type { MessageHistoryItem } from '../messaging/types';

const plural = new Intl.PluralRules('uk-UA');
const NOUN: Record<string, string> = { one: 'реакція', few: 'реакції', many: 'реакцій' };

export function reactionCountLabel(total: number) {
  return `${total} ${NOUN[plural.select(total)] ?? 'реакції'}`;
}

export function totalReactions(item: MessageHistoryItem) {
  return item.reactions?.reduce((total, reaction) => total + reaction.count, 0) ?? 0;
}

export const reactionActions: ConversationAction[] = [
  {
    id: 'reactions',
    icon: <SmileyIcon size={18} />,
    label: (target) => reactionCountLabel(totalReactions(target.items[0]!)),
    available: (target) => target.kind === 'message' && totalReactions(target.items[0]) > 0,
    execute: (target, commands) => commands.showReactions(target.items[0]!),
  },
];
