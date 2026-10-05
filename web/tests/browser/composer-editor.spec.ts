import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import ts from 'typescript';

const editorSource = readFileSync(
  new URL(
    '../../src/features/social/messaging/components/ComposerEditor/composer-editor-selection.ts',
    import.meta.url,
  ),
  'utf8',
);
const editorScript = ts.transpileModule(editorSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

test.beforeEach(async ({ page }) => {
  await page.setContent(
    '<div id="editor" contenteditable="true" role="textbox">До після</div><input id="search" placeholder="Пошук емодзі">',
  );
  await page.addScriptTag({
    content: `window.editorOperations = (() => { const exports = {}; ${editorScript}; return exports; })();`,
  });
});

test('consecutive emoji inserts preserve position without refocusing the editor', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const root = document.getElementById('editor')!;
    const operations = (
      window as unknown as {
        editorOperations: {
          captureEditorSelection: (root: HTMLElement) => Range;
          setEditorInputEnabled: (root: HTMLElement, enabled: boolean) => void;
          insertAtSavedRange: (root: HTMLElement, text: string, range: Range) => Range;
          restoreEditorSelection: (root: HTMLElement, range: Range) => void;
        };
      }
    ).editorOperations;
    root.focus();
    const range = document.createRange();
    range.setStart(root.firstChild!, 3);
    range.collapse(true);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    let saved = operations.captureEditorSelection(root);
    operations.setEditorInputEnabled(root, false);
    let focuses = 0;
    root.addEventListener('focus', () => {
      focuses++;
    });
    saved = operations.insertAtSavedRange(root, '🙂', saved);
    saved = operations.insertAtSavedRange(root, '🚀', saved);
    const didFocusDuringInsertion = focuses > 0;
    const text = root.textContent;
    operations.setEditorInputEnabled(root, true);
    root.focus({ preventScroll: true });
    operations.restoreEditorSelection(root, saved);
    return {
      text,
      didFocusDuringInsertion,
      selectedWithinEditor: root.contains(window.getSelection()!.anchorNode),
    };
  });
  expect(result.text).toBe('До 🙂🚀після');
  expect(result.didFocusDuringInsertion).toBe(false);
  expect(result.selectedWithinEditor).toBe(true);
});

test('replacing a saved selection leaves picker search focused', async ({ page }) => {
  const result = await page.evaluate(() => {
    const root = document.getElementById('editor')!;
    const operations = (
      window as unknown as {
        editorOperations: {
          captureEditorSelection: (root: HTMLElement) => Range;
          setEditorInputEnabled: (root: HTMLElement, enabled: boolean) => void;
          insertAtSavedRange: (root: HTMLElement, text: string, range: Range) => Range;
        };
      }
    ).editorOperations;
    root.focus();
    const range = document.createRange();
    range.setStart(root.firstChild!, 3);
    range.setEnd(root.firstChild!, 8);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    const saved = operations.captureEditorSelection(root);
    operations.setEditorInputEnabled(root, false);
    document.getElementById('search')!.focus();
    operations.insertAtSavedRange(root, '🙂', saved);
    return { text: root.textContent, focus: document.activeElement?.id };
  });
  expect(result).toEqual({ text: 'До 🙂', focus: 'search' });
});

test('saved insertion preserves mention chips and supports a cleared draft', async ({ page }) => {
  const result = await page.evaluate(() => {
    const root = document.getElementById('editor')!;
    const operations = (
      window as unknown as {
        editorOperations: {
          insertAtSavedRange: (root: HTMLElement, text: string, range: Range | null) => Range;
          setEditorInputEnabled: (root: HTMLElement, enabled: boolean) => void;
        };
      }
    ).editorOperations;
    root.innerHTML = 'Привіт <span contenteditable="false" data-member-id="member">@Оля</span>!';
    operations.setEditorInputEnabled(root, false);
    const saved = operations.insertAtSavedRange(root, '🙂', null);
    const mention = root.querySelector('[data-member-id]')?.textContent;
    const text = root.textContent;
    root.replaceChildren();
    operations.insertAtSavedRange(root, '🚀', saved);
    return { text, mention, cleared: root.textContent };
  });
  expect(result).toEqual({ text: 'Привіт @Оля!🙂', mention: '@Оля', cleared: '🚀' });
});
