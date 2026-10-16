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
  if (markdown === null) return <>Повідомлення видалено</>;
  if (!markdown.trim()) return <>Вкладення</>;
  if (isLoneGif({ markdown, blocks })) return <>GIF</>;
  return <MessageMarkdown markdown={markdown} mentions={mentions} inline />;
}
