import type { Translation } from '../translation';
import type { common as source } from '../uk/common';

export const common = {
  actions: {
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    add: 'Add',
    create: 'Create',
    edit: 'Edit',
    close: 'Close',
    retry: 'Retry',
    tryAgain: 'Try again',
    send: 'Send',
    forward: 'Forward',
    reply: 'Reply',
    copy: 'Copy',
    back: 'Back',
    done: 'Done',
    search: 'Search',
    moreActions: 'More actions',
  },
  you: 'You',
  member: 'Member',
  refreshing: 'Refreshing',
} satisfies Translation<typeof source>;
