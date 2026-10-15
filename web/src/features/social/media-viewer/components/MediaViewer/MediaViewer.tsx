import { useShellAppearance } from '@ap-education/shell-sdk';
import { AppearanceScope, useIsMobile } from '@ap-education/ui';
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import type { MediaGallery } from '../../media-gallery';
import type { ViewerActions } from '../../types';
import { SlideContent } from './SlideContent';
import { ViewerBottomBar } from './ViewerBottomBar';
import { ViewerTools } from './ViewerTools';
import { ViewerTopBar } from './ViewerTopBar';

interface MediaViewerProps {
  gallery: MediaGallery;
  actions: ViewerActions;
}

/** The bars over the open gallery and what React draws inside its slides; dark in either theme. */
export function MediaViewer({ gallery, actions }: MediaViewerProps) {
  const { accent } = useShellAppearance();
  const isMobile = useIsMobile();
  const { current, mounted, zoomable, zoomedIn } = useSyncExternalStore(
    gallery.subscribe,
    gallery.getView,
  );
  const media = current?.kind === 'media' ? current.media : undefined;
  // Tools sit by the close button on a wide screen, as on Discord, and under the thumb on a phone.
  const toolsEdge = isMobile ? 'bottom' : 'top';
  const zoom = !isMobile && zoomable ? { zoomedIn, toggle: () => gallery.toggleZoom() } : undefined;

  // The viewer closes first, so whatever comes next happens in the chat, not behind it.
  const leave = (next: () => void) => {
    gallery.close();
    next();
  };
  const tools = media && (
    <ViewerTools media={media} actions={actions} onLeave={leave} edge={toolsEdge} zoom={zoom} />
  );

  return createPortal(
    <AppearanceScope appearance="dark" accent={accent}>
      {media && (
        <>
          <ViewerTopBar
            media={media}
            tools={toolsEdge === 'top' && tools}
            onClose={() => gallery.close()}
            onShowInChat={() => leave(() => actions.showInChat(media.item.message.id))}
          />
          <ViewerBottomBar
            media={media}
            memberId={actions.context.memberId}
            tools={toolsEdge === 'bottom' && tools}
          />
        </>
      )}
      {mounted.map(({ id, element, slide }) =>
        createPortal(<SlideContent slide={slide} current={media} />, element, String(id)),
      )}
    </AppearanceScope>,
    gallery.element,
  );
}
