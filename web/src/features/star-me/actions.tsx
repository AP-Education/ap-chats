import { AiSpark } from '@ap-education/ui';
import { PaperPlaneRightIcon } from '@phosphor-icons/react';

import type { ConversationAction } from '../social/messaging/types';
import type { MemberSummary } from '../workspaces/types';

export function askStarMeAction(starMe: MemberSummary): ConversationAction {
  return {
    id: 'ask-star-me',
    icon: <AiSpark variant="line" size={18} />,
    accent: 'ai',
    // Picked messages ask from the selection bar, where the button speaks for itself.
    label: (target, t) =>
      target.kind === 'batch' ? t(($) => $.starMe.ask) : t(($) => $.starMe.askStarMe),
    available: (target, context) =>
      context.canPost && target.items.some((item) => item.message.markdown !== null),
    execute: (target, commands) => commands.ask(starMe, target.items),
  };
}

export const makeStarMeAnswerOwnAction: ConversationAction = {
  id: 'make-own',
  icon: <PaperPlaneRightIcon size={18} />,
  accent: 'ai',
  label: () => 'Зробити моїм',
  available: (target, context) =>
    target.kind === 'message' &&
    context.canPost &&
    Boolean(
      target.items[0].message.privateToMe &&
      target.items[0].message.assistantAnswer &&
      target.items[0].message.markdown !== null,
    ),
  execute: (target, commands) => commands.makeOwn(target.items[0]!),
};
