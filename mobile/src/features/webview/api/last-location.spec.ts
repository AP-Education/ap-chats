import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

interface LocationModule {
  rememberLocation: (navigation: { url: string; loading: boolean }, appUrl: string) => void;
  loadLastLocation: (appUrl: string) => Promise<string | null>;
  forgetLastLocation: () => void;
}

function fixture() {
  const values = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
  const exports = {} as LocationModule;
  const source = readFileSync(new URL('./last-location.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  runInNewContext(compiled, {
    exports,
    URL,
    require: (name: string) => {
      assert.equal(name, '@react-native-async-storage/async-storage');
      return { __esModule: true, default: storage };
    },
  });
  return exports;
}

const appUrl = 'https://app.example.test/c';
const conversation = 'https://app.example.test/c/direct/conversation';

test('a download starting in the main frame cannot replace the last conversation', async () => {
  const locations = fixture();
  locations.rememberLocation({ url: conversation, loading: false }, appUrl);
  locations.rememberLocation(
    { url: 'https://app.example.test/files/document.md', loading: true },
    appUrl,
  );

  assert.equal(await locations.loadLastLocation(appUrl), conversation);
});

test('a completed in-app navigation is restored, while a foreign file is ignored', async () => {
  const locations = fixture();
  locations.rememberLocation({ url: conversation, loading: false }, appUrl);
  locations.rememberLocation(
    { url: 'https://files.example.test/document.pdf', loading: false },
    appUrl,
  );

  assert.equal(await locations.loadLastLocation(appUrl), conversation);
  assert.equal(await locations.loadLastLocation('https://other.example.test/'), null);
});

test('forgetting the previous page leaves no conversation to restore', async () => {
  const locations = fixture();
  locations.rememberLocation({ url: conversation, loading: false }, appUrl);
  locations.forgetLastLocation();

  assert.equal(await locations.loadLastLocation(appUrl), null);
});
