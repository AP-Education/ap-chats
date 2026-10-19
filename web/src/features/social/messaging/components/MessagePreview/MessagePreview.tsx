import { useTranslation } from 'react-i18next';

import { MessageMarkdown } from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';
import type { MentionLabel } from '@/features/social/mentions/types';

import { isLoneGif } from '../../gifs/gif-links';
import type { MessageBlock } from '../../types';

export function MessagePreview({
  markdown,
  blocks,
  mentions,
}: {
  markdown: string | null;
  blocks?: MessageBlock[];
  mentions?: MentionLabel[];
}) {
  const { t } = useTranslation('messaging');

  if (markdown === null) return <>{t(($) => $.message.preview.deleted)}</>;
  if (!markdown.trim()) return <>{t(($) => $.message.preview.attachment)}</>;
  if (isLoneGif({ markdown, blocks })) return <>GIF</>;
  return <MessageMarkdown markdown={markdown} mentions={mentions} inline />;
}
