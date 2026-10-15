import { AiCosmos, AiText } from '@ap-education/ui';

import type { ActionTarget, ConversationAction } from '../../actions';

interface AssistedActionLabelProps {
  action: ConversationAction;
  target: ActionTarget;
  className?: string;
}

/** An assistant's action, labelled on its own small sky wherever actions are listed. */
export function AssistedActionLabel({ action, target, className }: AssistedActionLabelProps) {
  return (
    <AiCosmos className={className}>
      {action.icon}
      <AiText>{action.label(target)}</AiText>
    </AiCosmos>
  );
}
