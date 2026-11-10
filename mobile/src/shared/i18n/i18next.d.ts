import type { resources } from './resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'auth';
    enableSelector: true;
    resources: (typeof resources)['uk'];
  }
}
