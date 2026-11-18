import type { ComposerLabels, UploadLabels } from '@ap-education/timeline/composer';
import type { TimelineLabels } from '@ap-education/timeline/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { ChatsLanguage } from '@/shared/i18n/i18n';
import { useChatsLanguage } from '@/shared/i18n/useChatsLanguage';

const INTL_LOCALES: Record<ChatsLanguage, string> = { uk: 'uk-UA', en: 'en-US' };

/** The locale dates and sizes are written in for a Chats language, as the timeline package expects. */
export function intlLocale(language: ChatsLanguage): string {
  return INTL_LOCALES[language];
}

/** The timeline package's words in the reader's language, in place of its Ukrainian defaults. */
export function useTimelineLabels(): TimelineLabels & { locale: string } {
  const { t } = useTranslation(['messaging', 'common']);
  const locale = intlLocale(useChatsLanguage());

  return useMemo(
    () => ({
      log: t(($) => $.timelineLabels.log),
      older: t(($) => $.timelineLabels.older),
      newer: t(($) => $.timelineLabels.newer),
      unread: t(($) => $.timeline.newMessages),
      toNewer: t(($) => $.timelineLabels.toNewer),
      toBottom: t(($) => $.timelineLabels.toBottom),
      sending: t(($) => $.message.delivery.sending),
      failed: t(($) => $.message.delivery.failed),
      retry: t(($) => $.common.actions.retry),
      sent: t(($) => $.message.delivery.sent),
      read: t(($) => $.message.delivery.read),
      file: t(($) => $.attachments.fileFallback),
      showEntry: t(($) => $.timelineLabels.showEntry),
      dayAt: (day: string, time: string) => t(($) => $.timelineLabels.dayAt, { day, time }),
      today: t(($) => $.timeline.today),
      yesterday: t(($) => $.timeline.yesterday),
      locale,
    }),
    [t, locale],
  );
}

/** The composer package's words in the reader's language. */
export function useComposerLabels(): ComposerLabels {
  const { t } = useTranslation(['messaging', 'common']);

  return useMemo(
    () => ({
      field: t(($) => $.composer.field),
      placeholder: t(($) => $.composer.placeholder),
      send: t(($) => $.common.actions.send),
    }),
    [t],
  );
}

/** The words of the composer's files in the reader's language. */
export function useUploadLabels(): UploadLabels {
  const { t } = useTranslation(['messaging', 'common']);
  const locale = intlLocale(useChatsLanguage());

  return useMemo(
    () => ({
      locale,
      attach: t(($) => $.composer.attach),
      dropFiles: t(($) => $.composer.dropFiles),
      uploads: t(($) => $.attachments.drafts),
      uploadQueued: t(($) => $.attachments.status.queued),
      uploadProgress: (percent: number) =>
        t(($) => $.attachments.status.uploading, { progress: percent }),
      uploadProcessing: t(($) => $.attachments.status.processing),
      uploadReady: t(($) => $.attachments.status.ready),
      uploadFailed: t(($) => $.attachments.status.failed),
      uploadExpired: t(($) => $.attachments.errors.uploadExpired),
      uploadError: t(($) => $.attachments.errors.uploadFailed),
      retryUpload: t(($) => $.common.actions.retry),
      viewFile: (name: string) => t(($) => $.attachments.view, { name }),
      describeFile: (name: string) => t(($) => $.attachments.describeImage, { name }),
      removeFile: (name: string) => t(($) => $.attachments.remove, { name }),
      file: t(($) => $.attachments.fileFallback),
      description: t(($) => $.attachments.imageDescription),
      descriptionHint: t(($) => $.attachments.imageDescriptionPlaceholder),
      save: t(($) => $.common.actions.save),
      cancel: t(($) => $.common.actions.cancel),
      close: t(($) => $.common.actions.close),
      tooManyFiles: (limit: number) => t(($) => $.attachments.errors.tooMany, { max: limit }),
      emptyFile: (name: string) => t(($) => $.attachments.errors.empty, { name }),
      fileTooLarge: (name: string, limit: string) =>
        t(($) => $.attachments.errors.fileTooLarge, { name, limit }),
      messageTooLarge: (limit: string) => t(($) => $.attachments.errors.totalTooLarge, { limit }),
      noUploadPolicy: t(($) => $.attachments.errors.limitsUnavailable),
    }),
    [t, locale],
  );
}
