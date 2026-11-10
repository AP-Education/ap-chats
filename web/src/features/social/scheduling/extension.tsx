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
      unavailable: ({ attachmentsReady, canWait }) => {
        if (!canWait) return 'Цей запит надсилається лише одразу';
        if (!attachmentsReady)
          return 'Дочекайтеся завантаження файлів або видаліть невдалі вкладення';
        return undefined;
      },
      Dialog: ScheduleMessageDialog,
    },
  ],
  ComposerAccessory: ScheduledMessagesEntry,
};
