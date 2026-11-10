import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources } from './resources';

/** One instance for both React roots (the app and the call window): neither needs a provider. */
export const i18n = createInstance({
  resources,
  lng: 'uk',
  fallbackLng: 'uk',
  defaultNS: 'auth',
  // Native text renders as is, with no markup to escape.
  interpolation: { escapeValue: false },
  initAsync: false,
}).use(initReactI18next);

void i18n.init();
