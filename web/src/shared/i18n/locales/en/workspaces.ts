import type { Translation } from '../../translation';
import type { workspaces as source } from '../uk/workspaces';

export const workspaces = {
  accessLevels: {
    owner: 'Administrator',
    manager: 'Manager',
    member: 'Member',
  },
  accessLevelHints: {
    owner: 'Everything a manager can do, plus assigning access levels.',
    manager: 'Channels, roles and people. Reads only the channels they are added to.',
    member: 'Works in the channels they are added to.',
  },
  accessLevelLabel: 'Access level: {{level}}. Change',
  changeAccessLevelFailed: 'Couldn’t change the access level.',
  unnamedMember: 'Name unavailable',
  loadFailed: 'Couldn’t load workspaces',
  noWorkspace: {
    title: 'No workspace yet',
    description: 'Create one with the “+” button among the workspaces.',
  },
  header: {
    retryLoading: 'Retry loading',
    createPrompt: 'Create a workspace',
    edit: 'Edit workspace',
  },
  rail: {
    retryLoading: 'Retry loading workspaces',
    create: 'Create a workspace',
  },
  form: {
    name: 'Workspace name',
    nameRequired: 'Enter a name',
    nameTooLong: 'Maximum 128 characters',
    namePlaceholder: 'For example, AP Education',
  },
  modal: {
    createTitle: 'Set up your workspace',
    editTitle: 'Edit workspace',
    description: 'Add a name and an icon. You can always change them later.',
    saveFailed: 'Couldn’t save the workspace.',
  },
  avatar: {
    uploadFailed: 'Couldn’t upload the image',
    uploadLabel: 'Upload an icon',
    upload: 'Upload',
  },
} satisfies Translation<typeof source>;
