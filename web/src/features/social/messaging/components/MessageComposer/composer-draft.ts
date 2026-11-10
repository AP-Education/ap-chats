import type { ComposerDraft } from '@ap-education/timeline/composer';

export interface SavedComposerDraft extends ComposerDraft {
  assistant: boolean;
}

export const EMPTY_DRAFT: SavedComposerDraft = { markdown: '', labels: {}, assistant: false };

/** Retain the audience with the words; a restored private draft must never become public. */
export function parseComposerDraft(stored: string | null): SavedComposerDraft {
  if (!stored) return EMPTY_DRAFT;
  try {
    const value: unknown = JSON.parse(stored);
    if (
      !value ||
      typeof value !== 'object' ||
      !('markdown' in value) ||
      typeof value.markdown !== 'string'
    )
      return EMPTY_DRAFT;
    const labels =
      'labels' in value && value.labels && typeof value.labels === 'object'
        ? Object.fromEntries(
            Object.entries(value.labels).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          )
        : {};
    return {
      markdown: value.markdown,
      labels,
      assistant: 'assistant' in value && value.assistant !== false,
    };
  } catch {
    return { markdown: stored, labels: {}, assistant: false };
  }
}
