import type * as source from '../../../messages/uk';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    enableSelector: true;
    resources: typeof source;
  }
}
