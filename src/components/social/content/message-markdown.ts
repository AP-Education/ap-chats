import { BadRequestException, Injectable } from '@nestjs/common';

import type { MentionTargets } from '../mentions/types';

type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  name?: string;
  attributes?: Record<string, string | null>;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
};

const allowedTypes = new Set([
  'root',
  'paragraph',
  'text',
  'strong',
  'emphasis',
  'delete',
  'inlineCode',
  'code',
  'link',
  'blockquote',
  'list',
  'listItem',
  'break',
  'textDirective',
  // GFM shapes the client shows as plain text, accepted as they were before the server read GFM.
  'table',
  'tableRow',
  'tableCell',
  'footnoteDefinition',
  'footnoteReference',
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface NormalizedMessageContent {
  markdown: string;
  plainText: string;
  mentions: MentionTargets;
  /** Every link the text makes, bare ones included, in the order they appear. */
  links: string[];
}

interface CollectedMentions {
  memberIds: Set<string>;
  roleIds: Set<string>;
  everyone: boolean;
}

/** What one pass over the tree gathers. */
interface Reading {
  mentions: CollectedMentions;
  plain: string[];
  links: string[];
}

const newReading = (): Reading => ({
  mentions: { memberIds: new Set(), roleIds: new Set(), everyone: false },
  plain: [],
  links: [],
});

type ReadReference = (value: string, mentions: CollectedMentions) => string;

function requireId(value: string, message = 'Invalid mention') {
  if (!uuidPattern.test(value)) throw new BadRequestException(message);
}

// Each inline reference: what it mentions and how it reads as plain text. The client keeps the
// same grammar in web/src/features/social/mentions/mention-tokens.ts.
const references = new Map<string, ReadReference>([
  [
    'mention',
    (value, mentions) => {
      if (value !== 'everyone') throw new BadRequestException('Invalid mention');
      mentions.everyone = true;
      return '@everyone';
    },
  ],
  [
    'member',
    (value, mentions) => {
      requireId(value);
      mentions.memberIds.add(value);
      return `@${value}`;
    },
  ],
  [
    'role',
    (value, mentions) => {
      requireId(value);
      mentions.roleIds.add(value);
      return `@${value}`;
    },
  ],
  // A channel is only linked to, so it mentions no one.
  [
    'channel',
    (value) => {
      requireId(value, 'Invalid channel link');
      return `#${value}`;
    },
  ],
]);

function readDirective(node: MarkdownNode, { mentions, plain }: Reading): void {
  if (Object.keys(node.attributes ?? {}).length)
    throw new BadRequestException('Unsupported Markdown directive');
  const [label, ...rest] = node.children ?? [];
  if (!label || rest.length || label.type !== 'text')
    throw new BadRequestException('Invalid mention');
  const value = label.value?.toLowerCase() ?? '';

  const read = node.name ? references.get(node.name) : undefined;
  if (!read) throw new BadRequestException('Unsupported Markdown directive');
  plain.push(read(value, mentions));
}

function readLink(node: MarkdownNode, { links }: Reading): void {
  if (!node.url || node.url.length > 2_048) throw new BadRequestException('Invalid link');
  try {
    const url = new URL(node.url);
    if (!['https:', 'http:', 'mailto:'].includes(url.protocol))
      throw new BadRequestException('Unsupported link protocol');
  } catch {
    throw new BadRequestException('Invalid link');
  }
  links.push(node.url);
}

function validateTree(node: MarkdownNode, reading: Reading): void {
  if (!allowedTypes.has(node.type)) throw new BadRequestException('Unsupported Markdown syntax');
  if (node.type === 'link') readLink(node, reading);
  if (node.type === 'textDirective') {
    readDirective(node, reading);
    return;
  }
  if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code') {
    reading.plain.push(node.value ?? '');
  }
  for (const child of node.children ?? []) validateTree(child, reading);
  if (['paragraph', 'blockquote', 'listItem', 'tableRow'].includes(node.type))
    reading.plain.push('\n');
}

// A reference is stored by its lowercase id; the rest of the text stays exactly as typed.
function lowercaseReferences(source: string, node: MarkdownNode): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (node.type === 'textDirective' && start !== undefined && end !== undefined) {
    return source.slice(0, start) + source.slice(start, end).toLowerCase() + source.slice(end);
  }

  return (node.children ?? []).reduce((text, child) => lowercaseReferences(text, child), source);
}

// The client's grammar, web/src/features/social/mentions/components/MessageMarkdown, so a bare
// link is a link on both sides.
async function markdownProcessor() {
  const [{ remark }, { default: remarkDirective }, { default: remarkGfm }] = await Promise.all([
    import('remark'),
    import('remark-directive'),
    import('remark-gfm'),
  ]);
  return remark().use(remarkDirective).use(remarkGfm, { singleTilde: false });
}

export async function messagePlainText(markdown: string): Promise<string> {
  const processor = await markdownProcessor();
  const reading = newReading();
  validateTree(processor.parse(markdown) as MarkdownNode, reading);
  return reading.plain.join('');
}

@Injectable()
export class MessageMarkdownService {
  async normalize(source: string, allowBlank = false): Promise<NormalizedMessageContent> {
    if (Buffer.byteLength(source, 'utf8') > 32_768)
      throw new BadRequestException('Message is too long');
    const normalizedSource = source.replace(/\r\n?/gu, '\n');
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u0008\u000B-\u001F\u007F]/u.test(normalizedSource))
      throw new BadRequestException('Message contains control characters');

    const processor = await markdownProcessor();
    const tree = processor.parse(normalizedSource) as MarkdownNode;
    const reading = newReading();
    validateTree(tree, reading);

    // Kept as typed, not re-serialized from the tree, which would escape every _ and * in it.
    const markdown = lowercaseReferences(normalizedSource, tree).trim();
    const plainText = reading.plain.join('');
    if (!allowBlank && !plainText.trim()) throw new BadRequestException('Message cannot be blank');
    if (Buffer.byteLength(markdown, 'utf8') > 32_768)
      throw new BadRequestException('Message is too long');

    const { mentions, links } = reading;
    return {
      markdown,
      plainText,
      mentions: {
        memberIds: [...mentions.memberIds],
        roleIds: [...mentions.roleIds],
        everyone: mentions.everyone,
      },
      links,
    };
  }
}
