import type { Translation } from '../translation';
import type { appInfo as source } from '../uk/appInfo';

export const appInfo = {
  title: 'App',
  version: 'Version',
  channel: 'Update channel',
  updatesOff: 'Updates are off',
  update: 'Update',
  embedded: 'Built into the app',
  published: 'Published {{date}}',
  runtime: 'Runtime',
} satisfies Translation<typeof source>;
