import type { AppTab } from '@ap-education/shell-sdk';
import { ChatTextIcon, PhoneIcon, UsersThreeIcon } from '@phosphor-icons/react';

import type { ChatsLanguage } from '@/shared/i18n/i18n';

export const chatsSections = ['channels', 'direct', 'calls'] as const;
export type ChatsSection = (typeof chatsSections)[number];

function isWithin(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Direct messages and calls belong to the person; every other page is the team's. */
export function sectionAt(pathname: string): ChatsSection {
  if (isWithin(pathname, '/direct')) return 'direct';
  if (isWithin(pathname, '/calls')) return 'calls';
  return 'channels';
}

/** A section's tab, named in every language Chats speaks, for the shell and for Chats' own rail. */
export interface ChatsTab extends AppTab {
  label: Record<ChatsLanguage, string>;
}

export const teamTab: ChatsTab = {
  id: 'team',
  label: { uk: 'Команда', en: 'Team' },
  icon: UsersThreeIcon,
  symbol: { ios: 'person.2', android: 'groups' },
  path: '/channels',
  includes: (path) => sectionAt(path) === 'channels',
  rail: true,
};

export const personalTab: ChatsTab = {
  id: 'personal',
  label: { uk: 'Особисте', en: 'Personal' },
  icon: ChatTextIcon,
  symbol: { ios: 'bubble.left', android: 'forum' },
  path: '/direct',
  includes: (path) => sectionAt(path) === 'direct',
};

export const callsTab: ChatsTab = {
  id: 'calls',
  label: { uk: 'Дзвінки', en: 'Calls' },
  icon: PhoneIcon,
  symbol: { ios: 'phone', android: 'call' },
  path: '/calls',
  includes: (path) => sectionAt(path) === 'calls',
};
