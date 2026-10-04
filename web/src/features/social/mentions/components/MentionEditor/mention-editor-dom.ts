import type { ComposerDraft } from '@/features/social/messaging/types';

const mentionPattern = /:member\[([0-9a-f-]{36})\]/gi;

function serialize(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';

  const memberId = node.dataset.memberId;
  if (memberId) return `:member[${memberId}]`;
  if (node.tagName === 'BR') return '\n';

  const content = [...node.childNodes].map(serialize).join('');
  return node.tagName === 'DIV' || node.tagName === 'P' ? `${content}\n` : content;
}

export function serializeEditor(root: HTMLElement | null): string {
  return root ? [...root.childNodes].map(serialize).join('') : '';
}

export function mentionChip(id: string, label: string, className: string) {
  const chip = document.createElement('span');
  chip.dataset.memberId = id;
  chip.contentEditable = 'false';
  chip.className = className;
  chip.textContent = `@${label}`;
  return chip;
}

export function restoreEditor(root: HTMLElement, draft: ComposerDraft, chipClass: string) {
  root.replaceChildren();
  let start = 0;
  for (const match of draft.markdown.matchAll(mentionPattern)) {
    root.append(document.createTextNode(draft.markdown.slice(start, match.index)));
    root.append(mentionChip(match[1]!, draft.labels[match[1]!] ?? 'учасник', chipClass));
    start = match.index + match[0].length;
  }
  root.append(document.createTextNode(draft.markdown.slice(start)));
}
