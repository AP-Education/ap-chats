import type { Translation } from '../translation';
import type { realtime as source } from '../uk/realtime';

export const realtime = {
  connection: {
    failed: 'Couldn’t connect to the server',
    reconnecting: 'Reconnecting',
    offline: 'You’re offline. Reconnecting',
  },
} satisfies Translation<typeof source>;
