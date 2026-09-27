import { PushPinIcon } from '@phosphor-icons/react';

import type { ConversationAction } from '../conversation/actions';

export const pinActions: ConversationAction[] = [
  {
    id: 'pin',
    icon: <PushPinIcon size={17} />,
    label: (target) => (target.items[0]?.pin ? 'Відкріпити' : 'Закріпити'),
    available: (target, context) =>
      target.kind === 'message' &&
      context.canManage &&
      context.canPost &&
      target.items[0].message.markdown !== null,
    execute: (target, commands) => commands.pin(target.items[0]!, !target.items[0]!.pin),
  },
];
