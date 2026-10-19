import { CalendarDotsIcon } from '@phosphor-icons/react';

import type { ConversationExtension } from '@/features/social/conversation-scope/extensions';

import { ScheduledMessagesEntry } from './components/ScheduledMessagesEntry/ScheduledMessagesEntry';
import { ScheduleMessageDialog } from './components/ScheduleMessageDialog/ScheduleMessageDialog';

/** Sending later: an option on the send button, and a way into what already waits. */
export const schedulingExtension: ConversationExtension = {
  id: 'scheduling',
  sendOptions: [
    {
      id: 'schedule',
      label: (t) => t(($) => $.scheduling.extension.label),
      icon: <CalendarDotsIcon size={18} />,
      // The server keeps no uploads for later, so files go only with a message sent now.
      unavailable: ({ hasAttachments, canWait }, t) => {
        if (hasAttachments) return t(($) => $.scheduling.extension.noAttachments);
        if (!canWait) return t(($) => $.scheduling.extension.immediateOnly);
        return undefined;
      },
      Dialog: ScheduleMessageDialog,
    },
  ],
  ComposerAccessory: ScheduledMessagesEntry,
};
