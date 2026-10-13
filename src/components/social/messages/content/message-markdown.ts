import { BadRequestException, Injectable } from '@nestjs/common';

import type { MentionTargets } from '@/components/social/mentions/types';

type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  name?: string;
  attributes?: Record<string, string | null>;
  children?: MarkdownNode[];
};

const allowedTypes = new Set([
  'root',
  'paragraph',
  'text',
  'strong',
  'emphasis',
  'inlineCode',
  'code',
  'link',
  'blockquote',
  'list',
  'listItem',
  'break',
  'textDirective',
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface NormalizedMessageContent {
  markdown: string;
  plainText: string;
  mentions: MentionTargets;
}

interface CollectedMentions {
  memberIds: Set<string>;
  roleIds: Set<string>;
  everyone: boolean;
}

const noMentions = (): CollectedMentions => ({
  memberIds: new Set(),
  roleIds: new Set(),
  everyone: false,
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

function readDirective(node: MarkdownNode, mentions: CollectedMentions, plain: string[]): void {
  if (Object.keys(node.attributes ?? {}).length)
    throw new BadRequestException('Unsupported Markdown directive');
  const [label, ...rest] = node.children ?? [];
  if (!label || rest.length || label.type !== 'text')
    throw new BadRequestException('Invalid mention');
  const value = label.value?.toLowerCase() ?? '';
  label.value = value;

  const read = node.name ? references.get(node.name) : undefined;
  if (!read) throw new BadRequestException('Unsupported Markdown directive');
  plain.push(read(value, mentions));
}

function validateTree(node: MarkdownNode, mentions: CollectedMentions, plain: string[]): void {
  if (!allowedTypes.has(node.type)) throw new BadRequestException('Unsupported Markdown syntax');
  if (node.type === 'link') {
    if (!node.url || node.url.length > 2_048) throw new BadRequestException('Invalid link');
    try {
      const url = new URL(node.url);
      if (!['https:', 'http:', 'mailto:'].includes(url.protocol))
        throw new BadRequestException('Unsupported link protocol');
    } catch {
      throw new BadRequestException('Invalid link');
    }
  }
  if (node.type === 'textDirective') {
    readDirective(node, mentions, plain);
    return;
  }
  if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code') {
    plain.push(node.value ?? '');
  }
  for (const child of node.children ?? []) validateTree(child, mentions, plain);
  if (['paragraph', 'blockquote', 'listItem'].includes(node.type)) plain.push('\n');
}

async function markdownProcessor() {
  const [{ remark }, { default: remarkDirective }] = await Promise.all([
    import('remark'),
    import('remark-directive'),
  ]);
  return remark().use(remarkDirective);
}

export async function messagePlainText(markdown: string): Promise<string> {
  const processor = await markdownProcessor();
  const plain: string[] = [];
  validateTree(processor.parse(markdown) as MarkdownNode, noMentions(), plain);
  return plain.join('');
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
    const tree = processor.parse(normalizedSource);
    const mentions = noMentions();
    const plain: string[] = [];
    validateTree(tree as MarkdownNode, mentions, plain);
    const markdown = processor.stringify(tree).trim();
    if (!allowBlank && !plain.join('').trim())
      throw new BadRequestException('Message cannot be blank');
    if (Buffer.byteLength(markdown, 'utf8') > 32_768)
      throw new BadRequestException('Message is too long');
    return {
      markdown,
      plainText: plain.join(''),
      mentions: {
        memberIds: [...mentions.memberIds],
        roleIds: [...mentions.roleIds],
        everyone: mentions.everyone,
      },
    };
  }
}
