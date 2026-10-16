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
      label: 'Запланувати повідомлення',
      icon: <CalendarDotsIcon size={18} />,
      // The server keeps no uploads for later, so files go only with a message sent now.
      unavailable: ({ hasAttachments, canWait }) => {
        if (hasAttachments) return 'Файли поки не можна запланувати';
        if (!canWait) return 'Цей запит надсилається лише одразу';
        return undefined;
      },
      Dialog: ScheduleMessageDialog,
    },
  ],
  ComposerAccessory: ScheduledMessagesEntry,
};
