import {
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

import {
  captureEditorSelection,
  insertAtSavedRange,
  restoreEditorSelection,
  setEditorInputEnabled,
} from './composer-editor-selection';

export interface ComposerEditorHandle {
  rootElement: () => HTMLDivElement | null;
  clear: () => void;
  focus: () => void;
  blur: () => void;
  insertText: (text: string) => void;
  insertNode: (node: Node, range: Range) => void;
  /** Captures the current caret so a later resumeInput/insertText can restore it even after focus has moved elsewhere. */
  saveSelection: () => void;
  /** Disables real DOM input (e.g. while a native keyboard-replacement panel is shown) without moving focus. */
  suspendInput: () => void;
  /** Re-enables real input without moving focus — used when a panel closes but the real keyboard will reclaim focus on its own. */
  releaseInput: () => void;
  /** Re-enables real input and restores focus, optionally placing the caret at a viewport point. */
  resumeInput: (point?: { x: number; y: number }) => void;
  /** Resumes input while placing the caret at the given viewport point. */
  focusAtPoint: (clientX: number, clientY: number) => void;
}

interface ComposerEditorProps {
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  editorStyle?: CSSProperties;
  autoFocus?: boolean;
  onMount?: (root: HTMLDivElement) => void;
  onChange?: () => void;
  onSubmit?: () => void;
  onEscape?: () => void;
  onPasteFiles?: (files: File[]) => void;
  editorRef?: Ref<ComposerEditorHandle>;
}

/**
 * The composer's bare contentEditable surface: DOM mechanics only (mount,
 * paste routing, submit/escape, imperative insertion, and suspending real
 * input so a native keyboard-replacement panel can take over without losing
 * the caret). It has no opinion on what ends up inside it — MentionEditor
 * layers @-autocomplete on top by reading/writing through this handle, the
 * same way anything else would.
 */
export function ComposerEditor({
  placeholder,
  ariaLabel,
  className,
  editorStyle,
  autoFocus,
  onMount,
  onChange,
  onSubmit,
  onEscape,
  onPasteFiles,
  editorRef,
}: ComposerEditorProps) {
  const root = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  // Tracks the caret position while it's inside this editor. Blurring (e.g. to open a
  // picker/keyboard-replacement panel) moves or clears the live Selection, so without
  // this, inserting afterwards (insertText) would fall back to "append at the end"
  // instead of wherever the user had actually placed the caret.
  const lastRange = useRef<Range | null>(null);
  const inputSuspended = useRef(false);

  function captureSelection() {
    if (!root.current || inputSuspended.current) return;
    const range = captureEditorSelection(root.current);
    if (range) lastRange.current = range;
  }

  // Deliberately not a document-wide `selectionchange` listener gated on anything but
  // which element is focused: that event fires async and its timing relative to focus
  // moving to another element (the picker's search input, a category button) isn't
  // reliably ordered, so a broader listener could occasionally capture a stale/collapsed
  // range and silently corrupt the caret position it's supposed to remember.
  useEffect(() => {
    const capture = () => {
      if (!root.current || inputSuspended.current || document.activeElement !== root.current)
        return;
      const range = captureEditorSelection(root.current);
      if (range) lastRange.current = range;
    };
    document.addEventListener('selectionchange', capture);
    return () => document.removeEventListener('selectionchange', capture);
  }, []);

  function insertNode(node: Node, range: Range) {
    range.deleteContents();
    // A DocumentFragment is emptied by insertNode (its children move into the
    // document, the fragment itself is left parentless), so `node` can't be
    // used to reposition the caret afterwards — anchor on its last child instead.
    const anchor = node instanceof DocumentFragment ? node.lastChild : node;
    range.insertNode(node);
    if (anchor) {
      range.setStartAfter(anchor);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    onChange?.();
  }

  function insertText(text: string) {
    if (!root.current) return;
    captureSelection();
    lastRange.current = insertAtSavedRange(root.current, text, lastRange.current);
    if (!inputSuspended.current) {
      root.current.focus({ preventScroll: true });
      restoreEditorSelection(root.current, lastRange.current);
    }
    onChange?.();
  }

  function releaseInput() {
    const editor = root.current;
    if (!editor) return;
    inputSuspended.current = false;
    setEditorInputEnabled(editor, true);
  }

  function resumeInput(point?: { x: number; y: number }) {
    const editor = root.current;
    if (!editor) return;
    releaseInput();
    const atPoint = point && document.caretRangeFromPoint?.(point.x, point.y);
    if (atPoint && editor.contains(atPoint.commonAncestorContainer))
      lastRange.current = atPoint.cloneRange();
    editor.focus({ preventScroll: true });
    restoreEditorSelection(editor, lastRange.current);
  }

  useImperativeHandle(editorRef, () => ({
    rootElement: () => root.current,
    clear: () => {
      root.current?.replaceChildren();
      lastRange.current = null;
      onChange?.();
    },
    focus: () => {
      if (!inputSuspended.current) root.current?.focus({ preventScroll: true });
    },
    blur: () => {
      captureSelection();
      root.current?.blur();
    },
    insertText,
    insertNode,
    saveSelection: captureSelection,
    suspendInput: () => {
      captureSelection();
      inputSuspended.current = true;
      if (root.current) setEditorInputEnabled(root.current, false);
    },
    releaseInput,
    resumeInput,
    focusAtPoint: (x, y) => resumeInput({ x, y }),
  }));

  return (
    <div
      ref={(node) => {
        root.current = node;
        if (node && !initialized.current) {
          onMount?.(node);
          initialized.current = true;
          if (autoFocus) node.focus();
        }
      }}
      className={className}
      style={editorStyle}
      contentEditable
      role="textbox"
      aria-multiline="true"
      aria-label={ariaLabel}
      data-placeholder={placeholder}
      onInput={() => onChange?.()}
      onBlur={captureSelection}
      onClick={() => onChange?.()}
      onKeyUp={() => onChange?.()}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Escape') {
          onEscape?.();
          return;
        }
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          onSubmit?.();
        }
      }}
      onPaste={(event) => {
        event.preventDefault();
        const files = Array.from(event.clipboardData.files);
        if (files.length && onPasteFiles) {
          onPasteFiles(files);
          return;
        }
        insertText(event.clipboardData.getData('text/plain'));
      }}
    />
  );
}
