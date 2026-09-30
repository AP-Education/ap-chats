import type { ConversationAction } from '@/features/social/conversation/actions';

const priorities = [['reply', 'quote'], ['copy'], ['edit', 'pin', 'forward', 'select'], ['delete']];

export function groupMessageActions(available: ConversationAction[]) {
  const known = new Set(priorities.flat());
  const groups = [
    ...priorities.slice(0, -1),
    available.filter((action) => !known.has(action.id)).map((action) => action.id),
    priorities[priorities.length - 1],
  ];

  return groups
    .map((group) =>
      group
        .map((id) => available.find((action) => action.id === id))
        .filter((action): action is ConversationAction => Boolean(action)),
    )
    .filter((group) => group.length > 0);
}
