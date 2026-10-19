export const reactions = {
  total_one: '{{count}} реакція',
  total_few: '{{count}} реакції',
  total_many: '{{count}} реакцій',
  total_other: '{{count}} реакції',
  yourReaction: '{{emoji}} {{amount}}, ваша реакція',
  reaction: 'Реакція {{emoji}}',
  toolbar: 'Реакції',
  more: 'Інші реакції',
  picker: 'Вибір реакції',
  all: 'Усі {{total}}',
  nameUnavailable: 'Ім’я недоступне',
  loadFailed: 'Не вдалося завантажити список.',
  andMore: 'і ще {{amount}}',
  errors: {
    tooMany: 'Тут уже забагато різних реакцій.',
    toggle: 'Не вдалося змінити реакцію.',
  },
} as const;
