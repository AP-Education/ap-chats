import { useTranslation } from 'react-i18next';

import { type ChatsLanguage, chatsLanguage } from './i18n';

/** The language Chats speaks right now; dates and numbers switch together with its words. */
export function useChatsLanguage(): ChatsLanguage {
  return chatsLanguage(useTranslation().i18n.language);
}
