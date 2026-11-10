export const workspaces = {
  accessLevels: {
    owner: 'Адміністратор',
    manager: 'Менеджер',
    member: 'Учасник',
  },
  accessLevelHints: {
    owner: 'Усе, що може менеджер, і призначення рівнів доступу.',
    manager: 'Канали, ролі та люди. Читає лише канали, де його вписали.',
    member: 'Працює в каналах, куди його вписали.',
  },
  accessLevelLabel: 'Рівень доступу: {{level}}. Змінити',
  changeAccessLevelFailed: 'Не вдалося змінити рівень доступу.',
  unnamedMember: 'Ім’я недоступне',
  loadFailed: 'Не вдалося завантажити робочі простори',
  noWorkspace: {
    title: 'Робочого простору ще немає',
    description: 'Створіть його кнопкою «+» серед робочих просторів.',
  },
  header: {
    retryLoading: 'Повторити завантаження',
    createPrompt: 'Створіть робочий простір',
    edit: 'Редагувати робочий простір',
  },
  rail: {
    retryLoading: 'Повторити завантаження робочих просторів',
    create: 'Створити робочий простір',
  },
  form: {
    name: 'Назва робочого простору',
    nameRequired: 'Введіть назву',
    nameTooLong: 'Максимум 128 символів',
    namePlaceholder: 'Наприклад, AP Education',
  },
  modal: {
    createTitle: 'Налаштуйте робочий простір',
    editTitle: 'Редагувати робочий простір',
    description: 'Додайте назву та іконку. Це завжди можна змінити пізніше.',
    saveFailed: 'Не вдалося зберегти робочий простір.',
  },
  avatar: {
    uploadFailed: 'Не вдалося завантажити зображення',
    uploadLabel: 'Завантажити іконку',
    upload: 'Завантажити',
  },
} as const;
