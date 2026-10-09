import type { ComposerDraft } from '@/features/social/messaging/types';

const EVERYONE_TOKEN = ':mention[everyone]';
const tokenPattern = /:(member|channel)\[([0-9a-f-]{36})\]|:mention\[everyone\]/gi;

function serialize(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';

  const { memberId, channelId, mention } = node.dataset;
  if (memberId) return `:member[${memberId}]`;
  if (channelId) return `:channel[${channelId}]`;
  if (mention === 'everyone') return EVERYONE_TOKEN;
  if (node.tagName === 'BR') return '\n';

  const content = [...node.childNodes].map(serialize).join('');
  if (node.tagName !== 'DIV' && node.tagName !== 'P') return content;

  // Return on a phone keyboard opens a block: it starts a new line, and a lone <br> only holds it open.
  const line = content === '\n' ? '' : content;
  return node.previousSibling ? `\n${line}` : line;
}

export function serializeEditor(root: HTMLElement | null): string {
  return root ? [...root.childNodes].map(serialize).join('') : '';
}

function chip(text: string, className: string) {
  const element = document.createElement('span');
  element.contentEditable = 'false';
  element.className = className;
  element.textContent = text;
  return element;
}

export function mentionChip(id: string, label: string, className: string) {
  const element = chip(`@${label}`, className);
  element.dataset.memberId = id;
  return element;
}

export function everyoneChip(className: string) {
  const element = chip('@everyone', className);
  element.dataset.mention = 'everyone';
  return element;
}

export function channelChip(id: string, name: string, className: string) {
  const element = chip(`#${name}`, className);
  element.dataset.channelId = id;
  return element;
}

function tokenChip(
  [, kind, id]: RegExpMatchArray,
  labels: Record<string, string>,
  chipClass: string,
) {
  if (kind === 'member') return mentionChip(id!, labels[id!] ?? 'учасник', chipClass);
  if (kind === 'channel') return channelChip(id!, labels[id!] ?? 'канал', chipClass);
  return everyoneChip(chipClass);
}

export function restoreEditor(root: HTMLElement, draft: ComposerDraft, chipClass: string) {
  root.replaceChildren();
  let start = 0;
  for (const match of draft.markdown.matchAll(tokenPattern)) {
    root.append(document.createTextNode(draft.markdown.slice(start, match.index)));
    root.append(tokenChip(match, draft.labels, chipClass));
    start = match.index + match[0].length;
  }
  root.append(document.createTextNode(draft.markdown.slice(start)));
}
