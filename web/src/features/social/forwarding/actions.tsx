import { ForwardIcon } from '../messaging/actionIcons';
import type { ConversationAction } from '../messaging/types';

export const forwardingActions: ConversationAction[] = [
  {
    id: 'forward',
    icon: <ForwardIcon size={18} />,
    label: (_, t) => t(($) => $.common.actions.forward),
    available: (target) =>
      target.kind !== 'text' &&
      target.items.length > 0 &&
      target.items.every((item) => item.message.markdown !== null),
    execute: (target, commands) => commands.forward(target.items),
  },
];
