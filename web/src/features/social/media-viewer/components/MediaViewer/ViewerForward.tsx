import { useTimelineMediaItem } from '@ap-education/timeline/media';
import { MediaViewerAction, useMediaViewer } from '@ap-education/ui/media';
import { useTranslation } from 'react-i18next';

import { extensionNamespaces } from '@/features/social/conversation-scope/extensions';
import { ForwardIcon } from '@/features/social/messaging/actionIcons';
import type { ChatMedia } from '@/features/social/messaging/message-media';
import type { MessageEntry } from '@/features/social/messaging/timeline/chat-entry';
import type { ActionTarget } from '@/features/social/messaging/types';

import type { ViewerActions } from '../../types';

/** Forwards the message the media on screen came in, as its row in the chat can. */
export function ViewerForward({ actions }: { actions: ViewerActions }) {
  const { t } = useTranslation(extensionNamespaces);
  const { entry } = useTimelineMediaItem<MessageEntry, ChatMedia>();
  const { leave } = useMediaViewer();
  const target: ActionTarget = { kind: 'message', items: [entry.payload.item] };
  const forward = actions.actions.find(
    (action) => action.id === 'forward' && action.available(target, actions.context),
  );
  if (!forward) return null;

  return (
    <MediaViewerAction
      label={forward.label(target, t)}
      onClick={() => leave(() => actions.run(forward, target))}
    >
      <ForwardIcon size={22} />
    </MediaViewerAction>
  );
}
