import { create } from 'zustand';

import type { UploadFile } from './attachments/upload-file';

/** What another part of the app hands a conversation's composer: words and files to send. */
export interface ComposerSeed {
  text: string;
  files: UploadFile[];
}

interface ComposerSeeds {
  byChannel: Record<string, ComposerSeed>;
  take: (channelId: string) => void;
}

export const useComposerSeeds = create<ComposerSeeds>((set) => ({
  byChannel: {},
  take: (channelId) =>
    set(({ byChannel }) => ({
      byChannel: Object.fromEntries(Object.entries(byChannel).filter(([id]) => id !== channelId)),
    })),
}));

/** The conversation's composer takes it the moment it is on screen, or at once if it already is. */
export function seedComposer(channelId: string, seed: ComposerSeed): void {
  useComposerSeeds.setState(({ byChannel }) => ({
    byChannel: { ...byChannel, [channelId]: seed },
  }));
}
