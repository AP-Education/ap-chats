import { createContext, useContext } from 'react';

export interface MediaViewer {
  /** Opens the viewer on the photo, video or GIF whose bubble carries this key. */
  open: (key: string) => void;
}

export const MediaViewerContext = createContext<MediaViewer | null>(null);

export function useMediaViewer(): MediaViewer {
  const value = useContext(MediaViewerContext);
  if (!value) {
    throw new Error('useMediaViewer must be used within MediaViewerProvider');
  }
  return value;
}
