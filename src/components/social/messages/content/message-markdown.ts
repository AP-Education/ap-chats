import { BadRequestException, Injectable } from '@nestjs/common';

import type { MentionTargets } from '@/components/social/mentions';

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
  everyone: boolean;
}

// Inline references: a member or the whole channel is mentioned, a channel is only linked to.
function readDirective(node: MarkdownNode, mentions: CollectedMentions, plain: string[]): void {
  if (Object.keys(node.attributes ?? {}).length)
    throw new BadRequestException('Unsupported Markdown directive');
  const [label, ...rest] = node.children ?? [];
  if (!label || rest.length || label.type !== 'text')
    throw new BadRequestException('Invalid mention');
  const value = label.value?.toLowerCase() ?? '';

  switch (node.name) {
    case 'mention':
      if (value !== 'everyone') throw new BadRequestException('Invalid mention');
      mentions.everyone = true;
      plain.push('@everyone');
      return;
    case 'member':
      if (!uuidPattern.test(value)) throw new BadRequestException('Invalid mention');
      label.value = value;
      mentions.memberIds.add(value);
      plain.push(`@${value}`);
      return;
    case 'channel':
      if (!uuidPattern.test(value)) throw new BadRequestException('Invalid channel link');
      label.value = value;
      plain.push(`#${value}`);
      return;
    default:
      throw new BadRequestException('Unsupported Markdown directive');
  }
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
  validateTree(
    processor.parse(markdown) as MarkdownNode,
    { memberIds: new Set(), everyone: false },
    plain,
  );
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
    const mentions: CollectedMentions = { memberIds: new Set(), everyone: false };
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
      mentions: { memberIds: [...mentions.memberIds], everyone: mentions.everyone },
    };
  }
}
