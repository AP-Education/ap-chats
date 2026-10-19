import type { Translation } from '../../translation';
import type { push as source } from '../uk/push';

export const push = {
  checking: 'Checking',
  priming: {
    title: 'Don’t miss calls and messages',
    description: 'Get notified right away, even when the app is closed.',
    enable: 'Turn on notifications',
    skip: 'Skip',
  },
  channelName: 'Messages',
} satisfies Translation<typeof source>;
