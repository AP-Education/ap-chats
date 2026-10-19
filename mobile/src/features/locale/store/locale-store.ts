import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { i18n } from '../../../shared/i18n/i18n';
import type { Locale } from '../types';
import { isLocale } from '../utils/is-locale';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

// The device's language until the page says which one it shows, the way the page itself picks it.
const deviceLanguage = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0];

// Persisted, so screens that show before the page loads speak the last language the person chose.
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: isLocale(deviceLanguage) ? deviceLanguage : 'uk',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'ap-chats:locale',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ locale }) => ({ locale }),
    },
  ),
);

// i18n follows the store from the first frame: the device's language, then the stored one, then each the page sends.
void i18n.changeLanguage(useLocaleStore.getState().locale);
useLocaleStore.subscribe(({ locale }) => void i18n.changeLanguage(locale));
