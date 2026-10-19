import { PushPinIcon } from '@phosphor-icons/react';

import type { ConversationAction } from '../messaging/types';

export const pinActions: ConversationAction[] = [
  {
    id: 'pin',
    icon: <PushPinIcon size={18} />,
    label: (target, t) =>
      target.items[0]?.pin ? t(($) => $.pins.actions.unpin) : t(($) => $.pins.actions.pin),
    available: (target, context) =>
      target.kind === 'message' && context.canPin && target.items[0].message.markdown !== null,
    execute: (target, commands) => commands.pin(target.items[0]!, !target.items[0]!.pin),
  },
];
