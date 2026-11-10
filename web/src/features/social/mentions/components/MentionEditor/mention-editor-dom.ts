import type { ComposerDraft } from '@ap-education/timeline/composer';

import { type MentionToken, splitTokens, tokenText, writeToken } from '../../mention-tokens';

/** An uneditable chip that serializes back to the token it shows. */
export function tokenChip(token: MentionToken, labels: Record<string, string>, className: string) {
  const element = document.createElement('span');
  element.contentEditable = 'false';
  element.className = className;
  element.dataset.token = writeToken(token);
  element.textContent = tokenText(token, token.kind === 'everyone' ? undefined : labels[token.id]);
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
