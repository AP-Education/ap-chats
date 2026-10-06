import type { AppManifest } from '@ap/shell-sdk';
import { ChatsIcon, HouseIcon } from '@phosphor-icons/react';

interface AppDefinition extends Omit<AppManifest, 'entry'> {
  baseUrl?: string;
}

const definitions: AppDefinition[] = [
  {
    id: 'chats',
    label: 'Чати',
    icon: ChatsIcon,
    paths: ['/', '/channels', '/direct', '/calls'],
    home: '/',
    rail: 'contributed',
    opensMobileMenuAt: (pathname) => pathname === '/channels' || pathname === '/direct',
    baseUrl: import.meta.env.VITE_MFE_CHATS_URL?.trim(),
  },
  {
    id: 'demo',
    label: 'Головна',
    icon: HouseIcon,
    paths: ['/apps/demo'],
    home: '/apps/demo',
    rail: 'tile',
    baseUrl: import.meta.env.VITE_MFE_DEMO_URL?.trim(),
  },
];

/** An application without a configured URL is simply absent from the shell. */
export const apps: AppManifest[] = definitions.flatMap(({ baseUrl, ...manifest }) =>
  baseUrl ? [{ ...manifest, entry: `${baseUrl.replace(/\/$/, '')}/remoteEntry.js` }] : [],
);
