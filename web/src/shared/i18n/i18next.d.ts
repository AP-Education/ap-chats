import type * as source from './locales/uk';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    enableSelector: true;
    resources: typeof source;
  }
}
