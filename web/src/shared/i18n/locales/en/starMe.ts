import type { Translation } from '../../translation';
import type { starMe as source } from '../uk/starMe';

export const starMe = {
  ask: 'Ask',
  askStarMe: 'Ask StarMe',
  nameUnavailable: 'Name unavailable',
  thinking: 'Thinking about the answer',
  visibleOnlyToYou: 'Only you can see this',
  messageCount_one: '{{count}} message',
  messageCount_other: '{{count}} messages',
  failures: {
    limited: 'Too many requests to StarMe. Try again in a bit.',
    forbidden: 'StarMe isn’t available for your account.',
    unavailable: 'StarMe isn’t responding right now.',
    failed: 'StarMe couldn’t answer.',
  },
} satisfies Translation<typeof source>;
