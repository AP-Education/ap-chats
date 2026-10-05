import {
  type MentionLabel,
  MessageMarkdown,
} from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';

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
