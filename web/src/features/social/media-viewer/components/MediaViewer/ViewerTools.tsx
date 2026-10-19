import { IconButton } from '@ap-education/ui';
import { MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import { extensionNamespaces } from '@/features/social/conversation-scope/extensions';
import { ForwardIcon } from '@/features/social/messaging/actionIcons';
import type { ActionTarget } from '@/features/social/messaging/types';

import type { ViewerActions, ViewerMedia } from '../../types';
import { ViewerDownload } from './ViewerDownload';
import { ViewerMenu } from './ViewerMenu';

export interface ViewerZoom {
  zoomedIn: boolean;
  toggle: () => void;
}

interface ViewerToolsProps {
  media: ViewerMedia;
  actions: ViewerActions;
  onLeave: (next: () => void) => void;
  /** Which edge of the screen the tools sit on; the menu opens away from it. */
  edge: 'top' | 'bottom';
  /** A button for it on a pointer device; fingers pinch instead. */
  zoom?: ViewerZoom;
}

/** What can be done with the media on screen and its message. */
export function ViewerTools({ media, actions, onLeave, edge, zoom }: ViewerToolsProps) {
  const { t } = useTranslation('mediaViewer');
  const { t: extensionT } = useTranslation(extensionNamespaces);
  const target: ActionTarget = { kind: 'message', items: [media.item] };
  const forward = actions.actions.find(
    (action) => action.id === 'forward' && action.available(target, actions.context),
  );
  const { source } = media;

  return (
    <>
      {zoom && (
        <IconButton
          size={40}
          aria-label={zoom.zoomedIn ? t(($) => $.zoomOut) : t(($) => $.zoomIn)}
          onClick={zoom.toggle}
        >
          {zoom.zoomedIn ? (
            <MagnifyingGlassMinusIcon size={22} />
          ) : (
            <MagnifyingGlassPlusIcon size={22} />
          )}
        </IconButton>
      )}
      {forward && (
        <IconButton
          size={40}
          aria-label={forward.label(target, extensionT)}
          onClick={() => onLeave(() => actions.run(forward, target))}
        >
          <ForwardIcon size={22} />
        </IconButton>
      )}
      {source.kind !== 'gif' && (
        <ViewerDownload messageId={media.item.message.id} attachment={source.attachment} />
      )}
      <ViewerMenu
        target={target}
        actions={actions}
        onLeave={onLeave}
        placement={edge === 'top' ? 'bottomRight' : 'topRight'}
      />
    </>
  );
}
