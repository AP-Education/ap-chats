export const webview = {
  filePreview: {
    title: 'Файл',
    close: 'Закрити',
    errorTitle: 'Не вдалося відкрити файл',
    errorDescription: 'Спробуй ще раз або повернися до чату.',
  },
  setup: {
    title: 'Налаштуй адресу вебзастосунку',
    description: 'Вкажи EXPO_PUBLIC_WEB_URL у mobile/.env, щоб відкрити AP App.',
  },
  connectionError: {
    title: "Немає з'єднання із сервером",
    description: 'Перевір мережу та спробуй ще раз.',
    retry: 'Спробувати знову',
  },
} as const;
