export function captureEditorSelection(root: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return root.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
}

export function setEditorInputEnabled(root: HTMLElement, enabled: boolean): void {
  root.contentEditable = enabled ? 'true' : 'false';
  if (enabled) root.removeAttribute('aria-readonly');
  else {
    root.setAttribute('aria-readonly', 'true');
    root.blur();
  }
}

// A detached Range edits the DOM without moving the document's Selection. Moving
// Selection inside a contenteditable can focus it and summon the iOS keyboard.
export function insertAtSavedRange(root: HTMLElement, text: string, saved: Range | null): Range {
  const range =
    saved && root.contains(saved.commonAncestorContainer)
      ? saved.cloneRange()
      : document.createRange();
  if (!saved || !root.contains(saved.commonAncestorContainer)) {
    range.selectNodeContents(root);
    range.collapse(false);
  }
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  return range.cloneRange();
}

export function restoreEditorSelection(root: HTMLElement, saved: Range | null): void {
  if (!saved || !root.contains(saved.commonAncestorContainer)) return;
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(saved.cloneRange());
}
