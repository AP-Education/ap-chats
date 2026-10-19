import type { Translation } from '../../translation';
import type { mentions as source } from '../uk/mentions';

export const mentions = {
  unnamed: {
    member: 'member',
    role: 'role',
    channel: 'channel',
  },
  deletedRole: 'deleted role',
  unavailableChannel: 'unavailable channel',
  suggestions: {
    everyoneHint: 'Notify everyone in the channel',
    roleHint: 'Role',
    nameUnavailable: 'Name unavailable',
    peopleAndRoles: 'Members and roles',
    people: 'Members',
    mentionLabel: 'Mention a person or role',
    channels: 'Channels',
    channelLabel: 'Link to a channel',
  },
} satisfies Translation<typeof source>;
