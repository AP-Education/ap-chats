import { BadRequestException, Injectable } from '@nestjs/common';

import type { MentionTargets } from '../mentions/types';

// The parts of an mdast node chat reads; every mdast node fits it as it is.
type MarkdownNode = {
  type: string;
  value?: string | undefined;
  url?: string | undefined;
  alt?: string | null | undefined;
  name?: string | undefined;
  attributes?: Record<string, string | null | undefined> | null | undefined;
  children?: MarkdownNode[] | undefined;
  position?:
    { start: { offset?: number | undefined }; end: { offset?: number | undefined } } | undefined;
};

const KEPT_TYPES = new Set([
  'paragraph',
  'text',
  'strong',
  'emphasis',
  'delete',
  'inlineCode',
  'code',
  'blockquote',
  'list',
  'listItem',
  'break',
  // GFM shapes the client shows as plain text, read for their text.
  'table',
  'tableRow',
  'tableCell',
  'footnoteDefinition',
  'footnoteReference',
]);
const BLOCK_CONTAINERS = new Set(['root', 'blockquote', 'listItem']);
const LINK_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);
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

interface Reference {
  /** Whether the value names something the reference can point at. */
  accepts: (value: string) => boolean;
  /** Records what it mentions and gives how it reads as plain text. */
  read: (value: string, mentions: CollectedMentions) => string;
}

const newReading = (): Reading => ({
  mentions: { memberIds: new Set(), roleIds: new Set(), everyone: false },
  plain: [],
  links: [],
});

const isId = (value: string) => uuidPattern.test(value);

// Each inline reference: what it mentions and how it reads as plain text. The client keeps the
// same grammar in web/src/features/social/mentions/mention-tokens.ts.
const references = new Map<string, Reference>([
  [
    'mention',
    {
      accepts: (value) => value === 'everyone',
      read: (_, mentions) => {
        mentions.everyone = true;
        return '@everyone';
      },
    },
  ],
  [
    'member',
    {
      accepts: isId,
      read: (value, mentions) => {
        mentions.memberIds.add(value);
        return `@${value}`;
      },
    },
  ],
  [
    'role',
    {
      accepts: isId,
      read: (value, mentions) => {
        mentions.roleIds.add(value);
        return `@${value}`;
      },
    },
  ],
  // A channel is only linked to, so it mentions no one.
  ['channel', { accepts: isId, read: (value) => `#${value}` }],
]);

/**
 * Chat keeps a few kinds of formatting; anything beyond them loses the formatting, not the
 * content. A heading becomes a paragraph, an image a link, a rule disappears, an unsafe link
 * keeps its label, and HTML or an unknown directive reads as the text it was typed as.
 */
function reshape(node: MarkdownNode, parent: MarkdownNode, source: string): MarkdownNode[] {
  const reference = referenceOf(node);
  if (reference) return [{ ...node, children: [{ type: 'text', value: reference.value }] }];
  if (node.type === 'heading') return [{ type: 'paragraph', children: reshapeAll(node, source) }];
  if (node.type === 'thematicBreak') return [];
  if (node.type === 'image') {
    return linkOrLabel(node.url, [{ type: 'text', value: node.alt || node.url || '' }]);
  }
  if (node.type === 'link') return linkOrLabel(node.url, reshapeAll(node, source));
  if (KEPT_TYPES.has(node.type)) {
    return [node.children ? { ...node, children: reshapeAll(node, source) } : node];
  }

  const text: MarkdownNode = { type: 'text', value: sourceOf(node, source) };
  return [BLOCK_CONTAINERS.has(parent.type) ? { type: 'paragraph', children: [text] } : text];
}

function reshapeAll(node: MarkdownNode, source: string): MarkdownNode[] {
  return (node.children ?? []).flatMap((child) => reshape(child, node, source));
}

/** What a directive such as `:member[id]` refers to, its value lower-cased; nothing for any other node. */
function referenceOf(node: MarkdownNode): { value: string; read: Reference['read'] } | undefined {
  if (node.type !== 'textDirective' || !node.name) return undefined;
  if (Object.keys(node.attributes ?? {}).length) return undefined;

  const reference = references.get(node.name);
  const [label, ...rest] = node.children ?? [];
  const value = label?.type === 'text' ? (label.value?.toLowerCase() ?? '') : '';
  if (!reference || rest.length || !reference.accepts(value)) return undefined;

  return { value, read: reference.read };
}

function linkOrLabel(url: string | undefined, label: MarkdownNode[]): MarkdownNode[] {
  return url && isSafeLink(url) ? [{ type: 'link', url, children: label }] : label;
}

function isSafeLink(url: string): boolean {
  if (url.length > 2_048) return false;
  try {
    return LINK_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

function sourceOf(node: MarkdownNode, source: string): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) return node.value ?? '';
  return source.slice(start, end);
}

// A reference is stored by its lowercase id; the rest of the text stays exactly as typed.
function lowercaseReferences(source: string, node: MarkdownNode): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (referenceOf(node) && start !== undefined && end !== undefined) {
    return source.slice(0, start) + source.slice(start, end).toLowerCase() + source.slice(end);
  }

  return (node.children ?? []).reduce((text, child) => lowercaseReferences(text, child), source);
}

// Every node here is one chat keeps, so this only reads the text, the mentions and the links.
function collect(node: MarkdownNode, reading: Reading): void {
  const reference = referenceOf(node);
  if (reference) {
    reading.plain.push(reference.read(reference.value, reading.mentions));
    return;
  }
  if (node.type === 'link' && node.url) reading.links.push(node.url);
  if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code') {
    reading.plain.push(node.value ?? '');
  }
  for (const child of node.children ?? []) collect(child, reading);
  if (['paragraph', 'blockquote', 'listItem', 'tableRow'].includes(node.type)) {
    reading.plain.push('\n');
  }
}

// The client's grammar, web/src/features/social/mentions/components/MessageMarkdown, so a bare
// link is a link on both sides.
async function parseMarkdown(source: string): Promise<MarkdownNode> {
  const [{ remark }, { default: remarkDirective }, { default: remarkGfm }] = await Promise.all([
    import('remark'),
    import('remark-directive'),
    import('remark-gfm'),
  ]);
  return remark().use(remarkDirective).use(remarkGfm, { singleTilde: false }).parse(source);
}

/** What the text says, whatever formatting chat cannot show: its plain text, mentions and links. */
function readTree(tree: MarkdownNode, source: string): Reading {
  const reading = newReading();
  collect({ ...tree, children: reshapeAll(tree, source) }, reading);
  return reading;
}

export async function messagePlainText(markdown: string): Promise<string> {
  return readTree(await parseMarkdown(markdown), markdown).plain.join('');
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

    const tree = await parseMarkdown(normalizedSource);
    // Stored as typed: printing the tree back would escape every _ and * in it, links included.
    const markdown = lowercaseReferences(normalizedSource, tree).trim();

    const { plain, mentions, links } = readTree(tree, normalizedSource);
    const plainText = plain.join('');
    if (!allowBlank && !plainText.trim()) throw new BadRequestException('Message cannot be blank');

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
