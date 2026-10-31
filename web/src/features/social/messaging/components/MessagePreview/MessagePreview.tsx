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
  if (markdown === null) return <>Повідомлення видалено</>;
  if (!markdown.trim())
    return <>{attachments?.some((file) => file.voice) ? 'Голосове повідомлення' : 'Вкладення'}</>;
  if (isLoneGif({ markdown, blocks })) return <>GIF</>;
  return <MessageMarkdown markdown={markdown} mentions={mentions} inline />;
}
