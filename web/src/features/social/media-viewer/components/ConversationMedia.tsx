import { useShellAppearance } from '@ap-education/shell-sdk';
import {
  TimelineMediaProvider,
  useTimelineMedia,
  type UseTimelineMediaOptions,
} from '@ap-education/timeline/media';
import { UKRAINIAN_LABELS } from '@ap-education/timeline/react';
import {
  MediaViewer,
  MediaViewerActions,
  MediaViewerDownload,
  MediaViewerZoom,
} from '@ap-education/ui/media';
import { message as toast } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  showDownloadError,
  useAttachmentUrls,
} from '@/features/social/messaging/components/MessageAttachments/useAttachmentAccess';
import { type ChatMedia, messageMedia } from '@/features/social/messaging/message-media';
import type { ChatEntry } from '@/features/social/messaging/timeline/chat-entry';

import type { ViewerActions } from '../types';
import { VideoSlide } from './MediaViewer/VideoSlide';
import { ViewerAuthor } from './MediaViewer/ViewerAuthor';
import { ViewerCaption } from './MediaViewer/ViewerCaption';
import { ViewerForward } from './MediaViewer/ViewerForward';
import { ViewerMenu } from './MediaViewer/ViewerMenu';

const LABELS = { ...UKRAINIAN_LABELS, showEntry: 'Показати в чаті' };

interface ConversationMediaProps {
  /** The conversation's history, whose media the viewer pages through and reads more of. */
  view: UseTimelineMediaOptions<ChatEntry, ChatMedia>['view'];
  actions: ViewerActions;
  /** Shows a message in the chat, by its id. */
  onShowEntry: (messageId: string) => void;
  /** The history whose bubbles open the media. */
  children: ReactNode;
}

/** The conversation's photos, videos and GIFs full screen, over the history that opens them. */
export function ConversationMedia({
  view,
  actions,
  onShowEntry,
  children,
}: ConversationMediaProps) {
  const media = useTimelineMedia({ view, read: messageMedia, onShowEntry, labels: LABELS });
  const urls = useAttachmentUrls();
  const { accent } = useShellAppearance();
  const { t } = useTranslation('mediaViewer');

  return (
    <TimelineMediaProvider value={media}>
      {children}
      <MediaViewer
        {...media.viewer}
        urls={urls}
        accent={accent}
        onOpenError={() => void toast.error(t(($) => $.openFailed))}
        renderVideo={(item, active) =>
          item.kind === 'video' && <VideoSlide key={item.key} media={item} active={active} />
        }
      >
        <ViewerAuthor />
        <ViewerCaption memberId={actions.context.memberId} />
        <MediaViewerActions>
          <MediaViewerZoom />
          <ViewerForward actions={actions} />
          <MediaViewerDownload onError={showDownloadError} />
          <ViewerMenu actions={actions} />
        </MediaViewerActions>
      </MediaViewer>
    </TimelineMediaProvider>
  );
}
