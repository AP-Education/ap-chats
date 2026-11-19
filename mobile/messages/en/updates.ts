import type { Translation } from '../translation';
import type { updates as source } from '../uk/updates';

export const updates = {
  required: {
    title: 'Update the app',
    description: 'This version is no longer supported. Install the new one from the app store.',
    open: 'Update',
  },
} satisfies Translation<typeof source>;
