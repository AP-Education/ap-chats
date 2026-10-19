import type { Translation } from '../translation';
import type { notifications as source } from '../uk/notifications';

export const notifications = {
  title: 'Notifications',
  native: {
    on: 'You can turn them off in your phone settings',
    off: 'Turn on notifications',
    blocked: 'Notifications are off. Turn them on in your phone settings',
  },
  browser: {
    on: 'Turn off notifications',
    off: 'Click to have the browser ask for notification permission',
    blocked: 'The browser blocked notifications. Allow them in the site settings',
  },
  errors: {
    denied:
      'The browser didn’t allow notifications. Check the permission for this site and your browser’s notification settings.',
    enable: 'Couldn’t turn on notifications. Try again.',
    disable: 'Couldn’t turn off notifications. Try again.',
    synchronize: 'Couldn’t update the subscription. We’ll retry when the connection is back.',
  },
} satisfies Translation<typeof source>;
