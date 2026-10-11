import { MessageMarkdown } from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';
import type { MemberSummary } from '@/features/workspaces/types';

export function MessagePreview({
  markdown,
  mentions,
}: {
  markdown: string | null;
  mentions?: MemberSummary[];
}) {
  if (markdown === null) return <>Повідомлення видалено</>;
  if (!markdown.trim()) return <>Вкладення</>;
  return <MessageMarkdown markdown={markdown} mentions={mentions} inline />;
}
