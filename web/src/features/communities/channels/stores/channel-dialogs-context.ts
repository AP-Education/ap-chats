import { createContext, useContext } from 'react';

/** Where a new channel goes: into a category, or into none. */
export interface NewChannelPlace {
  workspaceId: string;
  categoryId?: string;
  categoryName: string;
}

export type ChannelDialog =
  | { kind: 'create'; place: NewChannelPlace }
  | { kind: 'settings'; workspaceId: string; channelId: string };

export interface ChannelDialogs {
  create: (place: NewChannelPlace) => void;
  openSettings: (workspaceId: string, channelId: string) => void;
}

export const ChannelDialogsContext = createContext<ChannelDialogs | null>(null);

export function useChannelDialogs(): ChannelDialogs {
  const value = useContext(ChannelDialogsContext);
  if (!value) {
    throw new Error('useChannelDialogs must be used within ChannelDialogsProvider');
  }
  return value;
}
