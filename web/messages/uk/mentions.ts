export const mentions = {
  unnamed: {
    member: 'учасник',
    role: 'роль',
    channel: 'канал',
  },
  deletedRole: 'видалена роль',
  unavailableChannel: 'недоступний канал',
  roleHolders: {
    label: 'Роль {{name}}',
    empty: 'У ролі ще нікого немає',
  },
  spoiler: {
    reveal: 'Показати прихований текст',
  },
  suggestions: {
    everyoneHint: 'Сповістити всіх у каналі',
    // Typed after @ to find @everyone, separated by spaces.
    everyoneAliases: 'усі всі',
    roleHint: 'Роль',
    nameUnavailable: 'Ім’я недоступне',
    peopleAndRoles: 'Учасники та ролі',
    people: 'Учасники',
    mentionLabel: 'Згадати людину або роль',
    channels: 'Канали',
    channelLabel: 'Послатися на канал',
  },
} as const;
