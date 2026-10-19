export const auth = {
  signingIn: 'Заходимо',
  signingOut: 'Виходимо',
  signOutFailed: {
    title: 'Не вдалося завершити вихід',
    description: 'Спробуй ще раз, щоб завершити вихід зі спільного акаунта AP.',
    retry: 'Повторити вихід',
    signIn: 'Увійти',
  },
  signInFailed: {
    title: 'Не вдалося увійти',
    description: 'Спробуй ще раз за хвилину.',
    retry: 'Спробувати ще раз',
  },
  signIn: {
    title: 'Увійди в AP App',
    description: 'Один клік через спільний акаунт AP, і ти в чаті з командою.',
    action: 'Увійти',
  },
} as const;
