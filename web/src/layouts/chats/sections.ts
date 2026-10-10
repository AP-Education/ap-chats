import type { AppTab } from '@ap-education/shell-sdk';
import { ChatTextIcon, PhoneIcon, UsersThreeIcon } from '@phosphor-icons/react';

export type ChatsSection = 'channels' | 'direct' | 'calls';

function isWithin(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Direct messages and calls belong to the person; every other page is the team's. */
export function sectionAt(pathname: string): ChatsSection {
  if (isWithin(pathname, '/direct')) return 'direct';
  if (isWithin(pathname, '/calls')) return 'calls';
  return 'channels';
}

export const teamTab: AppTab = {
  id: 'team',
  label: 'Команда',
  icon: UsersThreeIcon,
  symbol: { ios: 'person.3', android: 'groups' },
  path: '/channels',
  includes: (path) => sectionAt(path) === 'channels',
  rail: true,
};

export const personalTab: AppTab = {
  id: 'personal',
  label: 'Особисте',
  icon: ChatTextIcon,
  symbol: { ios: 'bubble.left.and.bubble.right', android: 'forum' },
  path: '/direct',
  includes: (path) => sectionAt(path) === 'direct',
};

export const callsTab: AppTab = {
  id: 'calls',
  label: 'Дзвінки',
  icon: PhoneIcon,
  symbol: { ios: 'phone', android: 'call' },
  path: '/calls',
  includes: (path) => sectionAt(path) === 'calls',
};
