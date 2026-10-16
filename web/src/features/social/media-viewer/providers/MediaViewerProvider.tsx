import { type PropsWithChildren, useMemo } from 'react';

import { type MediaViewer, MediaViewerContext } from '../../messaging/media-viewer-context';
import type { HistoryItem } from '../../messaging/types';
import { MediaViewer as MediaViewerScreen } from '../components/MediaViewer/MediaViewer';
import { useMediaGallery } from '../hooks/useMediaGallery';
import type { ViewerActions } from '../types';

interface MediaViewerProviderProps extends PropsWithChildren {
  items: HistoryItem[];
  actions: ViewerActions;
}

export function MediaViewerProvider({ items, actions, children }: MediaViewerProviderProps) {
  const { gallery, open } = useMediaGallery(items);
  const viewer = useMemo<MediaViewer>(() => ({ open: (key) => void open(key) }), [open]);

  return (
    <MediaViewerContext.Provider value={viewer}>
      {children}
      {gallery && <MediaViewerScreen gallery={gallery} actions={actions} />}
    </MediaViewerContext.Provider>
  );
}
