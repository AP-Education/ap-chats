import { SmileyIcon } from '@phosphor-icons/react';

import type { ConversationAction } from '../conversation/actions';
import { reactionsLabel, totalReactions } from './reaction-display';

export const reactionActions: ConversationAction[] = [
  {
    id: 'reactions',
    icon: <SmileyIcon size={18} />,
    label: (target) => reactionsLabel(totalReactions(target.items[0]?.reactions)),
    available: (target) =>
      target.kind === 'message' && totalReactions(target.items[0].reactions) > 0,
    execute: (target, commands) => commands.showReactions(target.items[0]!),
  },
];
