import { type PropsWithChildren, useMemo } from 'react';

import type { HistoryItem } from '../../messaging/types';
import { MediaViewer as MediaViewerScreen } from '../components/MediaViewer/MediaViewer';
import { useMediaGallery } from '../hooks/useMediaGallery';
import { type MediaViewer, MediaViewerContext } from '../stores/media-viewer-context';
import type { PagedHistory, ViewerActions } from '../types';

interface MediaViewerProviderProps extends PropsWithChildren {
  items: HistoryItem[];
  history: PagedHistory;
  actions: ViewerActions;
}

export function MediaViewerProvider({
  items,
  history,
  actions,
  children,
}: MediaViewerProviderProps) {
  const { gallery, open } = useMediaGallery(items, history);
  const viewer = useMemo<MediaViewer>(() => ({ open: (key) => void open(key) }), [open]);

  return (
    <MediaViewerContext.Provider value={viewer}>
      {children}
      {gallery && <MediaViewerScreen gallery={gallery} actions={actions} />}
    </MediaViewerContext.Provider>
  );
}
