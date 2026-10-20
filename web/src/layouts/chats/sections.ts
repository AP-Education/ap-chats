import type { AppTab } from '@ap-education/shell-sdk';
import {
  ChatTextIcon,
  IdentificationCardIcon,
  PhoneIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';

export const chatsSections = ['clients', 'channels', 'direct', 'calls'] as const;
export type ChatsSection = (typeof chatsSections)[number];

function isWithin(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Clients' conversations are their own section; direct messages and calls belong to the person;
 * every other page is the team's.
 */
export function sectionAt(pathname: string): ChatsSection {
  if (isWithin(pathname, '/clients')) return 'clients';
  if (isWithin(pathname, '/direct')) return 'direct';
  if (isWithin(pathname, '/calls')) return 'calls';
  return 'channels';
}

export const clientsTab: AppTab = {
  id: 'clients',
  label: 'Clients',
  icon: IdentificationCardIcon,
  symbol: { ios: 'person.text.rectangle', android: 'badge' },
  path: '/clients',
  includes: (path) => sectionAt(path) === 'clients',
};

export const teamTab: AppTab = {
  id: 'team',
  label: 'Team',
  icon: UsersThreeIcon,
  symbol: { ios: 'person.2', android: 'groups' },
  path: '/channels',
  includes: (path) => sectionAt(path) === 'channels',
  rail: true,
};

export const personalTab: AppTab = {
  id: 'personal',
  label: 'Personal',
  icon: ChatTextIcon,
  symbol: { ios: 'bubble.left', android: 'forum' },
  path: '/direct',
  includes: (path) => sectionAt(path) === 'direct',
};

export const callsTab: AppTab = {
  id: 'calls',
  label: 'Calls',
  icon: PhoneIcon,
  symbol: { ios: 'phone', android: 'call' },
  path: '/calls',
  includes: (path) => sectionAt(path) === 'calls',
};
