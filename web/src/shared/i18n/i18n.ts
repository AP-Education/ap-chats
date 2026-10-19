import { createInstance } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

import type * as source from './locales/uk';

type Namespace = keyof typeof source;

/** The languages Chats has words for; Ukrainian is the one it falls back to. */
export const CHATS_LANGUAGES = ['uk', 'en'] as const;

export type ChatsLanguage = (typeof CHATS_LANGUAGES)[number];

/** The shell's language when Chats has words for it, else Ukrainian. */
export function chatsLanguage(locale: string): ChatsLanguage {
  return CHATS_LANGUAGES.find((language) => language === locale) ?? 'uk';
}

// All of a language's words arrive together, so no component waits for its own later.
const namespaces = Object.keys({
  calls: true,
  common: true,
  communities: true,
  conversation: true,
  directMessages: true,
  forwarding: true,
  mediaViewer: true,
  mentions: true,
  messaging: true,
  navigation: true,
  notifications: true,
  people: true,
  pins: true,
  reactions: true,
  realtime: true,
  roles: true,
  scheduling: true,
  starMe: true,
  wallpaper: true,
  workspaces: true,
} satisfies Record<Namespace, true>);

// One chunk per language, downloaded only by the people who read it.
function catalogs(locale: string): Promise<typeof source> {
  return import(`./locales/${locale}/index.ts`);
}

/** Chats' own instance: the shell and every other application keep theirs. */
export const i18n = createInstance({
  supportedLngs: CHATS_LANGUAGES,
  // English has every Ukrainian key, so there is nothing to fall back to and nothing extra to load.
  fallbackLng: false,
  ns: namespaces,
  defaultNS: 'common',
  // React escapes what it renders.
  interpolation: { escapeValue: false },
}).use(
  resourcesToBackend((locale: string, namespace: Namespace) =>
    catalogs(locale).then((loaded) => loaded[namespace]),
  ),
);

let started: Promise<unknown> | undefined;

/** Starts in the given language once, resolving when its words have loaded. */
export function i18nReady(language: ChatsLanguage): Promise<unknown> {
  started ??= i18n.init({ lng: language });
  return started;
}
