import type { TFunction } from 'i18next';

import { type MentionToken, splitTokens, tokenText, writeToken } from '../../mention-tokens';
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

/** An uneditable chip that serializes back to the token it shows. */
export function tokenChip(
  token: MentionToken,
  labels: Record<string, string>,
  className: string,
  t: TFunction<'mentions'>,
) {
  const element = document.createElement('span');
  element.contentEditable = 'false';
  element.className = className;
  element.dataset.token = writeToken(token);
  element.textContent = tokenText(
    token,
    t,
    token.kind === 'everyone' ? undefined : labels[token.id],
  );
  return element;
}

export function restoreEditor(
  root: HTMLElement,
  draft: ComposerDraft,
  chipClass: string,
  t: TFunction<'mentions'>,
) {
  const nodes = splitTokens(draft.markdown).map((part) =>
    typeof part === 'string'
      ? document.createTextNode(part)
      : tokenChip(part, draft.labels, chipClass, t),
  );
  root.replaceChildren(...nodes);
}
