import { useShellAppearance } from '@ap-education/shell-sdk';
import {
  TimelineMediaProvider,
  useTimelineMedia,
  type UseTimelineMediaOptions,
} from '@ap-education/timeline/media';
import { type TimelineLabels, UKRAINIAN_LABELS } from '@ap-education/timeline/react';
import {
  type MediaLabels,
  MediaViewer,
  MediaViewerActions,
  MediaViewerDownload,
  MediaViewerZoom,
} from '@ap-education/ui/media';
import { message as toast } from 'antd';
import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  showDownloadError,
  useAttachmentUrls,
} from '@/features/social/messaging/components/MessageAttachments/useAttachmentAccess';
import { type ChatMedia, messageMedia } from '@/features/social/messaging/message-media';
import type { ChatEntry } from '@/features/social/messaging/timeline/chat-entry';
import { useChatsLanguage } from '@/shared/i18n/useChatsLanguage';

import type { ViewerActions } from '../types';
import { VideoSlide } from './MediaViewer/VideoSlide';
import { ViewerAuthor } from './MediaViewer/ViewerAuthor';
import { ViewerCaption } from './MediaViewer/ViewerCaption';
import { ViewerForward } from './MediaViewer/ViewerForward';
import { ViewerMenu } from './MediaViewer/ViewerMenu';

// The locale the viewer's day and time are written in, per language Chats speaks.
const LOCALES = { uk: 'uk-UA', en: 'en-US' } as const;

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
  const { t } = useTranslation(['mediaViewer', 'common']);
  const language = useChatsLanguage();
  // The timeline's media words: only the viewer's title reads them, the rest stay the package's.
  const timelineLabels = useMemo<TimelineLabels>(
    () => ({
      ...UKRAINIAN_LABELS,
      showEntry: t(($) => $.showInChat),
      dayAt: (day, time) => t(($) => $.sentAt, { day, time }),
      today: t(($) => $.today),
      yesterday: t(($) => $.yesterday),
      locale: LOCALES[language],
    }),
    [t, language],
  );
  const mediaLabels = useMemo<MediaLabels>(
    () => ({
      viewer: t(($) => $.label),
      imageFailed: t(($) => $.imageFailed),
      videoLoading: t(($) => $.videoLoading),
      videoFailed: t(($) => $.videoFailed),
      close: t(($) => $.common.actions.close),
      zoomIn: t(($) => $.zoomIn),
      zoomOut: t(($) => $.zoomOut),
      download: (name) => t(($) => $.download, { name }),
      counter: (index, total) => t(($) => $.position, { index, total }),
    }),
    [t],
  );
  const media = useTimelineMedia({ view, read: messageMedia, onShowEntry, labels: timelineLabels });
  const urls = useAttachmentUrls();
  const { accent } = useShellAppearance();

  return (
    <TimelineMediaProvider value={media}>
      {children}
      <MediaViewer
        {...media.viewer}
        urls={urls}
        accent={accent}
        labels={mediaLabels}
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
