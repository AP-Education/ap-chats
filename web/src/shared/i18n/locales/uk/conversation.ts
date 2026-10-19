export const conversation = {
  historyLoadFailed: 'Не вдалося завантажити повідомлення',
  selection: {
    label: 'Вибрані повідомлення',
    cancel: 'Скасувати вибір',
    count: 'Вибрано: {{selected}}',
  },
  delete: {
    titleOne: 'Видалити повідомлення?',
    titleMany_one: 'Видалити {{count}} повідомлення?',
    titleMany_few: 'Видалити {{count}} повідомлення?',
    titleMany_many: 'Видалити {{count}} повідомлень?',
    titleMany_other: 'Видалити {{count}} повідомлення?',
    content: 'Текст повідомлень стане недоступним усім учасникам каналу.',
    failed: 'Не вдалося видалити повідомлення.',
  },
  markUnread: 'Позначити непрочитаним',
  copyFailed: 'Не вдалося скопіювати текст',
  pinFailed: 'Не вдалося змінити закріплення.',
  markUnreadFailed: 'Не вдалося позначити непрочитаним.',
} as const;
