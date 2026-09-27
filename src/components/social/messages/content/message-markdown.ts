import { BadRequestException, Injectable } from '@nestjs/common';

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
  mentionedMemberIds: string[];
}

function validateTree(node: MarkdownNode, mentioned: Set<string>, plain: string[]): void {
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
    if (node.name !== 'member' || Object.keys(node.attributes ?? {}).length)
      throw new BadRequestException('Unsupported Markdown directive');
    const children = node.children ?? [];
    if (children.length !== 1 || children[0]?.type !== 'text')
      throw new BadRequestException('Invalid mention');
    const id = children[0].value?.toLowerCase() ?? '';
    if (!uuidPattern.test(id)) throw new BadRequestException('Invalid mention');
    children[0].value = id;
    mentioned.add(id);
    plain.push(`@${id}`);
    return;
  }
  if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code') {
    plain.push(node.value ?? '');
  }
  for (const child of node.children ?? []) validateTree(child, mentioned, plain);
  if (['paragraph', 'blockquote', 'listItem'].includes(node.type)) plain.push('\n');
}

@Injectable()
export class MessageMarkdownService {
  async normalize(source: string): Promise<NormalizedMessageContent> {
    if (Buffer.byteLength(source, 'utf8') > 32_768)
      throw new BadRequestException('Message is too long');
    const normalizedSource = source.replace(/\r\n?/gu, '\n');
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u0008\u000B-\u001F\u007F]/u.test(normalizedSource))
      throw new BadRequestException('Message contains control characters');

    const [{ remark }, { default: remarkDirective }] = await Promise.all([
      import('remark'),
      import('remark-directive'),
    ]);
    const processor = remark().use(remarkDirective);
    const tree = processor.parse(normalizedSource);
    const mentioned = new Set<string>();
    const plain: string[] = [];
    validateTree(tree as MarkdownNode, mentioned, plain);
    const markdown = processor.stringify(tree).trim();
    if (!plain.join('').trim()) throw new BadRequestException('Message cannot be blank');
    if (Buffer.byteLength(markdown, 'utf8') > 32_768)
      throw new BadRequestException('Message is too long');
    return { markdown, plainText: plain.join(''), mentionedMemberIds: [...mentioned] };
  }
}
