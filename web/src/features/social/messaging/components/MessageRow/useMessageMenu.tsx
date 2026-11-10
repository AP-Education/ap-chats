import type { ContextActionItem } from '@ap-education/ui';
import { useTranslation } from 'react-i18next';

import { extensionNamespaces } from '@/features/social/conversation-scope/extensions';

import { messageActionItems } from './messageActionItems';
import { useMessageActionScope } from './MessageActionScope';

/** The actions available for the message, or for selected text in it, and what choosing one does. */
export function useMessageMenu(): { groups: ContextActionItem[][]; select: (id: string) => void } {
  const scope = useMessageActionScope();
  const { t } = useTranslation(extensionNamespaces);
  const target = scope.selectedText ? scope.textTarget : scope.messageTarget;
  const available = scope.available(target);

  return {
    groups: messageActionItems(available, target, t),
    select: (id) => {
      const action = available.find((entry) => entry.id === id);
      if (action) scope.onAction(action, target);
    },
  };
}
