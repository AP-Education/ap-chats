import { ArrowBendUpRightIcon } from '@phosphor-icons/react';

import type { ConversationAction } from '../conversation/actions';

export const forwardingActions: ConversationAction[] = [
  {
    id: 'forward',
    icon: <ArrowBendUpRightIcon size={17} />,
    label: () => 'Переслати',
    available: (target) =>
      target.kind !== 'text' &&
      target.items.length > 0 &&
      target.items.every((item) => item.message.markdown !== null),
    execute: (target, commands) => commands.forward(target.items),
  },
];
