import { CopyIcon, PencilSimpleIcon, SelectionIcon, TrashIcon } from '@phosphor-icons/react';

import { QuoteIcon, ReplyIcon } from '../conversation/actionIcons';
import type { ConversationAction } from '../conversation/actions';

const textAvailable = (markdown: string | null) => markdown !== null;

export const messagingActions: ConversationAction[] = [
  {
    id: 'reply',
    icon: <ReplyIcon size={18} />,
    label: () => 'Відповісти',
    available: (target, context) =>
      target.kind === 'message' &&
      context.canPost &&
      textAvailable(target.items[0].message.markdown),
    execute: (target, commands) => commands.reply(target.items[0]!),
  },
  {
    id: 'quote',
    icon: <QuoteIcon size={18} />,
    label: () => 'Цитувати',
    available: (target, context) =>
      target.kind === 'text' && context.canPost && textAvailable(target.items[0].message.markdown),
    execute: (target, commands) => {
      if (target.kind === 'text') commands.reply(target.items[0], target.selectedText);
    },
  },
  {
    id: 'copy',
    icon: <CopyIcon size={18} />,
    label: () => 'Копіювати текст',
    available: (target) => target.items.some((item) => Boolean(item.message.markdown?.trim())),
    execute: (target, commands) =>
      commands.copy(target.items, target.kind === 'text' ? target.selectedText : undefined),
  },
  {
    id: 'select',
    icon: <SelectionIcon size={18} />,
    label: () => 'Вибрати',
    available: (target) => target.kind === 'message',
    execute: (target, commands) => commands.select(target.items[0]!),
  },
  {
    id: 'edit',
    icon: <PencilSimpleIcon size={18} />,
    label: () => 'Редагувати',
    available: (target, context) =>
      target.kind === 'message' &&
      context.canPost &&
      target.items[0].message.authorMemberId === context.memberId &&
      textAvailable(target.items[0].message.markdown),
    execute: (target, commands) => commands.edit(target.items[0]!),
  },
  {
    id: 'delete',
    icon: <TrashIcon size={18} />,
    label: () => 'Видалити',
    available: (target, context) =>
      context.canPost &&
      target.items.length > 0 &&
      target.items.every(
        (item) =>
          textAvailable(item.message.markdown) &&
          (item.message.authorMemberId === context.memberId || context.canManage),
      ),
    execute: (target, commands) => commands.remove(target.items),
  },
];
