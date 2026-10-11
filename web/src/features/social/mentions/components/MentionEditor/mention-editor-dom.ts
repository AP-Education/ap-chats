import { type MentionToken, splitTokens, writeToken } from '../../mention-tokens';
import type { ComposerDraft } from '../../types';

function serialize(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';

  if (node.dataset.token) return node.dataset.token;
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

function chipText(token: MentionToken, labels: Record<string, string>) {
  if (token.kind === 'everyone') return '@everyone';
  if (token.kind === 'channel') return `#${labels[token.id] ?? 'канал'}`;
  return `@${labels[token.id] ?? 'учасник'}`;
}

/** An uneditable chip that serializes back to the token it shows. */
export function tokenChip(token: MentionToken, labels: Record<string, string>, className: string) {
  const element = document.createElement('span');
  element.contentEditable = 'false';
  element.className = className;
  element.dataset.token = writeToken(token);
  element.textContent = chipText(token, labels);
  return element;
}

export function restoreEditor(root: HTMLElement, draft: ComposerDraft, chipClass: string) {
  const nodes = splitTokens(draft.markdown).map((part) =>
    typeof part === 'string'
      ? document.createTextNode(part)
      : tokenChip(part, draft.labels, chipClass),
  );
  root.replaceChildren(...nodes);
}
