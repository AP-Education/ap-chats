import type { AppManifest } from '@ap/shell-sdk';
import { ChatsIcon, SparkleIcon } from '@phosphor-icons/react';

interface AppDefinition extends Omit<AppManifest, 'entry'> {
  baseUrl?: string;
}

const definitions: AppDefinition[] = [
  {
    id: 'chats',
    label: 'Чати',
    icon: ChatsIcon,
    paths: ['/c'],
    home: '/c',
    rail: 'contributed',
    opensMobileMenuAt: (pathname) => pathname === '/c/channels' || pathname === '/c/direct',
    baseUrl: import.meta.env.VITE_MFE_CHATS_URL?.trim(),
  },
  // Shown to everyone until OIDC returns per-user capabilities.
  {
    id: 'ai',
    label: 'AI',
    icon: SparkleIcon,
    paths: ['/'],
    home: '/',
    rail: 'tile',
    baseUrl: import.meta.env.VITE_MFE_AI_URL?.trim(),
  },
];

/** An application without a configured URL is simply absent from the shell. */
export const apps: AppManifest[] = definitions.flatMap(({ baseUrl, ...manifest }) =>
  baseUrl ? [{ ...manifest, entry: `${baseUrl.replace(/\/$/, '')}/remoteEntry.js` }] : [],
);
