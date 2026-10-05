import { type RefObject, useLayoutEffect } from 'react';

const EDITABLE = 'input, textarea, select, [contenteditable="true"]';

export function useMobileMessageSelection(
  scrollRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    const root = scrollRef.current;
    if (!enabled || !root) return;
    const messageList = root;

    function clearMessageSelection() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const rows = messageList.querySelectorAll('[data-message-readonly]');
      for (let index = 0; index < selection.rangeCount; index++) {
        const range = selection.getRangeAt(index);
        const node = range.commonAncestorContainer;
        const container = node.nodeType === 1 ? (node as Element) : node.parentElement;
        if (container?.closest(EDITABLE)) continue;
        for (const row of rows) {
          if (!range.intersectsNode(row)) continue;
          selection.removeAllRanges();
          return;
        }
      }
    }

    function preventMessageSelection(event: Event) {
      const node = event.target as Node;
      const target = node.nodeType === 1 ? (node as Element) : node.parentElement;
      if (target?.closest(EDITABLE) || !target?.closest('[data-message-readonly]')) return;
      event.preventDefault();
      clearMessageSelection();
    }

    root.addEventListener('selectstart', preventMessageSelection);
    document.addEventListener('selectionchange', clearMessageSelection);
    clearMessageSelection();
    return () => {
      root.removeEventListener('selectstart', preventMessageSelection);
      document.removeEventListener('selectionchange', clearMessageSelection);
    };
  }, [enabled, scrollRef]);
}
