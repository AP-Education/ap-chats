import { useShellLocale } from '@ap-education/shell-sdk';
import { type PropsWithChildren, use, useLayoutEffect } from 'react';
import { I18nextProvider } from 'react-i18next';

import { chatsLanguage, i18n, i18nReady } from './i18n';

/** Chats speaks the language the person chose in the shell, when it has words for it. */
export function I18nProvider({ children }: PropsWithChildren) {
  const language = chatsLanguage(useShellLocale());
  // Chats appears once its first language has loaded; the shell shows the app loading meanwhile.
  use(i18nReady(language));

  // Before paint, so a language loaded earlier switches without a frame in the old one.
  useLayoutEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
