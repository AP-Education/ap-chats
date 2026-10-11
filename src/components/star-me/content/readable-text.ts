import { messagePlainText } from '@/components/social/messages/content';

/** A message's text with its mentions named, the way people read it. */
export async function readableText(
  markdown: string,
  mentions: { memberId: string; displayName: string | null }[],
): Promise<string> {
  const names = new Map(mentions.map(({ memberId, displayName }) => [memberId, displayName]));
  const plain = await messagePlainText(markdown);
  return plain
    .replace(/@([0-9a-f-]{36})/giu, (_, id: string) => `@${names.get(id) ?? 'учасник'}`)
    .trim();
}
