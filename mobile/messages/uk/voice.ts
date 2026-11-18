// Native composes these errors and the page shows them as sent, in the language it asked for.
export const voice = {
  errors: {
    callActive: 'Неможливо записувати під час дзвінка.',
    interruptedByCall: 'Запис перервано дзвінком.',
    recordFailed: 'Не вдалося записати голосове.',
    invalid: 'Запис порожній, надто короткий або перевищує 20 МБ.',
    interrupted: 'Запис перервано.',
    interruptedRetry: 'Запис перервано. Спробуйте ще раз.',
    permissionDenied: 'Немає дозволу на мікрофон. Дозвольте його в налаштуваннях AP App.',
    notSaved: 'Запис не збережено.',
    localUnavailable: 'Локальний запис недоступний. Запишіть повідомлення ще раз.',
    localIncomplete: 'Локальний запис неповний.',
    uploadFailed: 'Не вдалося завантажити голосове.',
    uploadFailedStatus: 'Не вдалося завантажити голосове ({{status}}).',
    otherConversation: 'Голосове належить іншій розмові.',
    apiMissing: 'Не налаштовано адресу API.',
    uploadCancelled: 'Завантаження скасовано.',
    transferFailed: 'Не вдалося передати файл. Спробуйте ще раз.',
  },
  /** The recording's file name before its extension. */
  fileName: 'Голосове-{{stamp}}',
} as const;
