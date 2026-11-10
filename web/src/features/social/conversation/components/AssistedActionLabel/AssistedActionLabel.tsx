import { AiCosmos, AiText } from '@ap-education/ui';
import { useTranslation } from 'react-i18next';

import { extensionNamespaces } from '@/features/social/conversation-scope/extensions';
import type { ActionTarget, ConversationAction } from '@/features/social/messaging/types';

interface AssistedActionLabelProps {
  action: ConversationAction;
  target: ActionTarget;
  className?: string;
}

/** An assistant's action, labelled on its own small sky wherever actions are listed. */
export function AssistedActionLabel({ action, target, className }: AssistedActionLabelProps) {
  const { t } = useTranslation(extensionNamespaces);

  return (
    <AiCosmos className={className}>
      {action.icon}
      <AiText>{action.label(target, t)}</AiText>
    </AiCosmos>
  );
}
