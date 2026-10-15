import type { ConversationAction } from '../../types';

const priorities = [['reply', 'quote'], ['copy'], ['edit', 'pin', 'forward', 'select'], ['delete']];

// An assistant's actions stand on their own just above delete, after what a person does by hand.
export function groupMessageActions(available: ConversationAction[]) {
  const known = new Set(priorities.flat());
  const assisted = available.filter((action) => action.accent === 'ai');
  const groups = [
    ...priorities.slice(0, -1),
    available
      .filter((action) => !known.has(action.id) && action.accent !== 'ai')
      .map((action) => action.id),
    assisted.map((action) => action.id),
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
