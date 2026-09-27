import {
  ChatCircleDotsIcon,
  CopyIcon,
  PencilSimpleIcon,
  QuotesIcon,
  SelectionIcon,
  TrashIcon,
} from '@phosphor-icons/react';

import type { ConversationAction } from '../conversation/actions';

const textAvailable = (markdown: string | null) => markdown !== null;

export const messagingActions: ConversationAction[] = [
  {
    id: 'reply',
    icon: <ChatCircleDotsIcon size={17} />,
    label: () => 'Відповісти',
    available: (target, context) =>
      target.kind === 'message' &&
      context.canPost &&
      textAvailable(target.items[0].message.markdown),
    execute: (target, commands) => commands.reply(target.items[0]!),
  },
  {
    id: 'quote',
    icon: <QuotesIcon size={17} />,
    label: () => 'Цитувати',
    available: (target, context) =>
      target.kind === 'text' && context.canPost && textAvailable(target.items[0].message.markdown),
    execute: (target, commands) => {
      if (target.kind === 'text') commands.reply(target.items[0], target.selectedText);
    },
  },
  {
    id: 'copy',
    icon: <CopyIcon size={17} />,
    label: () => 'Копіювати текст',
    available: (target) => target.items.some((item) => textAvailable(item.message.markdown)),
    execute: (target, commands) =>
      commands.copy(target.items, target.kind === 'text' ? target.selectedText : undefined),
  },
  {
    id: 'select',
    icon: <SelectionIcon size={17} />,
    label: () => 'Вибрати',
    available: (target) => target.kind === 'message',
    execute: (target, commands) => commands.select(target.items[0]!),
  },
  {
    id: 'edit',
    icon: <PencilSimpleIcon size={17} />,
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
    icon: <TrashIcon size={17} />,
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
