import { AiSpark } from '@ap-education/ui';

import type { ConversationAction } from '../social/conversation/actions';
import type { MemberSummary } from '../workspaces/types';

export function askStarMeAction(starMe: MemberSummary): ConversationAction {
  return {
    id: 'ask-star-me',
    icon: <AiSpark variant="line" size={18} />,
    accent: 'ai',
    // Picked messages ask from the selection bar, where the button speaks for itself.
    label: (target) => (target.kind === 'batch' ? 'Запитати' : 'Запитати StarMe'),
    available: (target, context) =>
      context.canPost && target.items.some((item) => item.message.markdown !== null),
    execute: (target, commands) => commands.ask(starMe, target.items),
  };
}
