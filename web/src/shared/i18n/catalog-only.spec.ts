import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const root = fileURLToPath(new URL('../..', import.meta.url));
const ukrainian = /[А-Яа-яІіЇїЄєҐґ]/;

/** Files whose Ukrainian is data rather than words shown to a person, with the reason. */
const allowed: Record<string, string> = {
  // The shell draws these tabs before Chats' catalogs load, so each carries every language itself.
  'layouts/chats/sections.ts': 'tab names for the shell',
};

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    if (!/\.tsx?$/.test(entry.name) || /\.(spec|d)\.ts$/.test(entry.name)) return [];
    return [path];
  });
}

/** Every piece of literal text in a file: strings, template parts and JSX text, never comments. */
function literals(path: string): { line: number; text: string }[] {
  const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const found: { line: number; text: string }[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      const line = file.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      found.push({ line, text: node.text });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

test('words a person reads come from the catalogs, so every language gets them', () => {
  const offenders = sources(root)
    .map((path) => relative(root, path).split(sep).join('/'))
    .filter((path) => !(path in allowed))
    .flatMap((path) =>
      literals(join(root, path))
        .filter(({ text }) => ukrainian.test(text))
        .map(({ line, text }) => `src/${path}:${line} ${text.trim().slice(0, 60)}`),
    );

  assert.deepEqual(offenders, [], 'move these into messages/uk and messages/en');
});
