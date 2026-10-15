import type { CSSProperties, Ref } from 'react';

/** A person named in a message, as history returns them for their tag. */
export interface MentionLabel {
  memberId: string;
  displayName: string | null;
  avatarPath?: string | null;
  isBot?: boolean;
}

// A message's text as the editor holds it: markdown plus the names of the references it shows as chips.
export interface ComposerDraft {
  markdown: string;
  labels: Record<string, string>;
}

export interface ComposerEditorApi {
  draft: () => ComposerDraft;
  clear: () => void;
  focus: () => void;
  blur: () => void;
  insertText: (text: string) => void;
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

export interface ComposerEditorSlotProps {
  editorRef?: Ref<ComposerEditorApi>;
  initialDraft?: ComposerDraft;
  /** Identifies the draft being edited, for an implementation that needs to remount when it changes (e.g. to re-run a mount-time restore). */
  draftKey?: string;
  className?: string;
  editorStyle?: CSSProperties;
  ariaLabel: string;
  placeholder?: string;
  autoFocus?: boolean;
  onChange?: (draft: ComposerDraft) => void;
  onSubmit?: () => void;
  onEscape?: () => void;
  onPasteFiles?: (files: File[]) => void;
  /** The strip above the composer where suggestion lists dock; an inline editor has none. */
  suggestionsHost?: HTMLElement | null;
}
