// References a message carries inline, as remark text directives; the server reads the same
// grammar in src/components/social/messages/content/message-markdown.ts.

export type MentionToken =
  { kind: 'member'; id: string } | { kind: 'channel'; id: string } | { kind: 'everyone' };

export const EVERYONE_TOKEN = ':mention[everyone]';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const uuidPattern = new RegExp(`^${UUID}$`);
const tokenPattern = new RegExp(`:(member|channel)\\[(${UUID})\\]|:mention\\[everyone\\]`, 'g');

const previewWords: Record<MentionToken['kind'], string> = {
  member: '@учасник',
  channel: '#канал',
  everyone: '@everyone',
};

export function writeToken(token: MentionToken): string {
  return token.kind === 'everyone' ? EVERYONE_TOKEN : `:${token.kind}[${token.id}]`;
}

/** The reference a parsed text directive stands for, or null when it is not one. */
export function readToken(name: string | undefined, label: string): MentionToken | null {
  if (name === 'mention' && label === 'everyone') return { kind: 'everyone' };
  if ((name === 'member' || name === 'channel') && uuidPattern.test(label))
    return { kind: name, id: label };
  return null;
}

/** The markdown as plain text runs with the references between them, in order. */
export function splitTokens(markdown: string): (string | MentionToken)[] {
  const parts: (string | MentionToken)[] = [];
  let start = 0;

  for (const match of markdown.matchAll(tokenPattern)) {
    const [written, kind, id] = match;
    const token: MentionToken =
      kind === 'member' || kind === 'channel' ? { kind, id: id! } : { kind: 'everyone' };
    parts.push(markdown.slice(start, match.index), token);
    start = match.index + written.length;
  }
  parts.push(markdown.slice(start));
  return parts;
}

/** One line of the markdown with its references read as words, without resolving names. */
export function previewText(markdown: string): string {
  return splitTokens(markdown)
    .map((part) => (typeof part === 'string' ? part : previewWords[part.kind]))
    .join('')
    .replace(/\s+/gu, ' ');
}
