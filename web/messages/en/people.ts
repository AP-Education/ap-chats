import type { Translation } from '../translation';
import type { people as source } from '../uk/people';

export const people = {
  nameUnavailable: 'Name unavailable',
  bot: 'bot',
  profileLabel: '{{name}}’s profile',
  memberProfileLabel: 'Member profile',
  memberUnavailable: 'Member unavailable',
  workspaceAssistant: 'Workspace assistant',
  loadingProfile: 'Loading profile',
  message: 'Message',
  call: 'Call',
  openConversationFailed: 'Couldn’t open the conversation.',
  roles: {
    title: 'Roles',
    manage: 'Manage roles',
    add: 'Add role',
    remove: 'Remove role {{name}}',
    changeFailed: 'Couldn’t change roles.',
    viewTitle: 'Roles: {{name}}',
    backToProfile: 'Back to profile',
  },
} satisfies Translation<typeof source>;
