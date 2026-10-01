import { ForwardIcon } from '../conversation/actionIcons';
import type { ConversationAction } from '../conversation/actions';

export const forwardingActions: ConversationAction[] = [
  {
    id: 'forward',
    icon: <ForwardIcon size={18} />,
    label: () => 'Переслати',
    available: (target) =>
      target.kind !== 'text' &&
      target.items.length > 0 &&
      target.items.every((item) => item.message.markdown !== null),
    execute: (target, commands) => commands.forward(target.items),
  },
];
