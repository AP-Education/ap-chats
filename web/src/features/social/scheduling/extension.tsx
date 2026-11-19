import { CalendarDotsIcon } from '@phosphor-icons/react';

import type { ConversationExtension } from '@/features/social/conversation-scope/extensions';
import { i18n } from '@/shared/i18n/i18n';

import { ScheduledMessagesEntry } from './components/ScheduledMessagesEntry/ScheduledMessagesEntry';
import { ScheduleMessageDialog } from './components/ScheduleMessageDialog/ScheduleMessageDialog';

/** Sending later: an option on the send button, and a way into what already waits. */
export const schedulingExtension: ConversationExtension = {
  id: 'scheduling',
  sendOptions: [
    {
      id: 'schedule',
      // Read where the button is drawn, so it is in the language Chats speaks then.
      get label() {
        return i18n.t(($) => $.extension.label, { ns: 'scheduling' });
      },
      icon: <CalendarDotsIcon size={18} />,
      unavailable: ({ attachmentsReady, canWait }) => {
        if (!canWait) return i18n.t(($) => $.extension.immediateOnly, { ns: 'scheduling' });
        if (!attachmentsReady)
          return i18n.t(($) => $.extension.attachmentsPending, { ns: 'scheduling' });
        return undefined;
      },
      Dialog: ScheduleMessageDialog,
    },
  ],
  ComposerAccessory: ScheduledMessagesEntry,
};
