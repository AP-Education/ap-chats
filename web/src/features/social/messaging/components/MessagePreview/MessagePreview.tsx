import { useTranslation } from 'react-i18next';

import { MessageMarkdown } from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';
import type { MentionLabel } from '@/features/social/mentions/types';

import type { Attachment } from '../../attachments/types';
import { isLoneGif } from '../../gifs/gif-links';
import type { MessageBlock } from '../../types';

export function MessagePreview({
  markdown,
  blocks,
  attachments,
  mentions,
}: {
  markdown: string | null;
  blocks?: MessageBlock[];
  attachments?: Attachment[];
  mentions?: MentionLabel[];
}) {
  const { t } = useTranslation('messaging');

  if (markdown === null) return <>{t(($) => $.message.preview.deleted)}</>;
  if (!markdown.trim())
    return (
      <>
        {attachments?.some((file) => file.voice)
          ? t(($) => $.message.preview.voice)
          : t(($) => $.message.preview.attachment)}
      </>
    );
  if (isLoneGif({ markdown, blocks })) return <>GIF</>;
  return <MessageMarkdown markdown={markdown} mentions={mentions} inline />;
}
