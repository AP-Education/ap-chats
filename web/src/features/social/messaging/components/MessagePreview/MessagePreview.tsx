import { MessageMarkdown } from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';
import type { MentionLabel } from '@/features/social/mentions/types';

export function MessagePreview({
  markdown,
  mentions,
}: {
  markdown: string | null;
  mentions?: MentionLabel[];
}) {
  if (markdown === null) return <>Повідомлення видалено</>;
  if (!markdown.trim()) return <>Вкладення</>;
  return <MessageMarkdown markdown={markdown} mentions={mentions} inline />;
}
