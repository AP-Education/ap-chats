import { type ContextActionItem, groupActions, messageActionOrder } from '@ap-education/ui';

import { AssistedActionLabel } from '@/features/social/conversation/components/AssistedActionLabel/AssistedActionLabel';

import type { ActionTarget, ConversationAction, ExtensionT } from '../../types';

/** The actions of a message in the groups a menu or a sheet draws, an assistant's on its own sky. */
export function messageActionItems(
  available: ConversationAction[],
  target: ActionTarget,
  t: ExtensionT,
): ContextActionItem[][] {
  return groupActions(available, messageActionOrder).map((group) =>
    group.map((action) => ({
      id: action.id,
      label:
        action.accent === 'ai' ? (
          <AssistedActionLabel action={action} target={target} />
        ) : (
          action.label(target, t)
        ),
      icon: action.icon,
      accent: action.accent,
    })),
  );
}
