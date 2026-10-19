import type { Translation } from '../../translation';
import type { roles as source } from '../uk/roles';

export const roles = {
  picker: {
    placeholder: 'Role',
    searchLabel: 'Find a role',
  },
  empty: 'No roles yet',
  noneFound: 'No roles found',
  nameTaken: 'A role with this name already exists.',
  unnamedMember: 'Name unavailable',
  colors: {
    label: 'Role color',
    custom: 'Custom color',
  },
  list: {
    loadFailed: 'Couldn’t load roles.',
    memberCount: 'People: {{people}}',
  },
  newRole: {
    placeholder: 'New role',
    label: 'New role name',
    createFailed: 'Couldn’t create the role.',
  },
  details: {
    name: 'Name',
    nameLabel: 'Role name',
    color: 'Color',
    hoist: 'Display separately',
    hoistHint:
      'People with this role appear as a separate group in the channel member list. Drag roles in the list to set the order of groups.',
    hoistLabel: 'Display separately in the member list',
    people: 'People',
    peopleHint: 'A role grants nothing by itself. It opens the channels whose lists it is in.',
    renameFailed: 'Couldn’t rename the role.',
    recolorFailed: 'Couldn’t change the role color.',
    hoistFailed: 'Couldn’t change how the role is displayed.',
    deleteFailed: 'Couldn’t delete the role.',
    deleteTitle: 'Delete this role?',
    deleteDescription: 'People will lose the channel access this role gave them.',
    deleteRole: 'Delete role',
  },
  members: {
    addLabel: 'People to add to the role',
    addPlaceholder: 'Add people',
    addFailed: 'Couldn’t add people to the role.',
    removeFailed: 'Couldn’t remove the person from the role.',
    empty: 'No one has this role yet',
    remove: 'Remove {{name}} from the role',
  },
  modal: {
    title: 'Roles',
    description: 'Groups of people for mentions and channel access lists',
    selectRole: 'Select a role to manage its members',
    allRoles: 'All roles',
  },
} satisfies Translation<typeof source>;
