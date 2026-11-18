export const search = {
  trigger: {
    label: 'Пошук людей і чатів',
    open: 'Відкрити пошук людей і чатів',
  },
  dialog: {
    title: 'Пошук',
    description: 'Люди й чати · {{workspace}}',
    inputLabel: 'Пошук людей і чатів',
    placeholder: 'Ім’я або назва каналу',
    hint: 'Введіть ім’я колеги, назву каналу або розмови.',
    searching: 'Шукаємо…',
    failed: 'Не вдалося виконати пошук.',
    retry: 'Повторити',
    empty: 'Нічого не знайдено. Спробуйте інше ім’я або назву.',
    opening: 'Відкриваємо розмову…',
    openFailed: 'Не вдалося відкрити розмову. Спробуйте ще раз.',
  },
  results: {
    label: 'Результати пошуку',
    limit: 'Показано перші 20 результатів. Уточніть пошук.',
    nameUnavailable: 'Ім’я недоступне',
  },
  groups: {
    channel: 'Канали',
    conversation: 'Розмови',
    person: 'Люди',
  },
  descriptions: {
    channel: 'Канал',
    person: 'Написати колезі',
    leftCompany: 'Учасник залишив компанію',
    conversation: 'Особиста розмова',
  },
} as const;
