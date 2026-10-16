import { createContext, useContext } from 'react';

/** What a bubble asks of the conversation's media viewer; the media-viewer feature provides it. */
export interface MediaViewer {
  /** Opens the viewer on the photo, video or GIF whose bubble carries this key. */
  open: (key: string) => void;
}

export const MediaViewerContext = createContext<MediaViewer | null>(null);

export function useMediaViewer(): MediaViewer {
  const value = useContext(MediaViewerContext);
  if (!value) {
    throw new Error('useMediaViewer must be used within MediaViewerContext.Provider');
  }
  return value;
}

/** The key a bubble and its slide in the viewer share. */
export function mediaKey(messageId: string, part: string): string {
  return `${messageId}:${part}`;
}
