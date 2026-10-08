import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type { AttentionReporter } from '../src/features/notifications/components/AttentionReporter';

const source = ts.transpileModule(
  readFileSync(
    new URL('../src/features/notifications/components/AttentionReporter.tsx', import.meta.url),
    'utf8',
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function page({ native = false } = {}) {
  const window = new EventTarget();
  const document = new EventTarget();
  let tick: (() => void) | undefined;
  Object.assign(window, {
    setInterval: (callback: () => void) => ((tick = callback), 1),
    clearInterval: () => undefined,
  });
  const socket = Object.assign(new EventTarget(), {
    connected: true,
    emitted: [] as boolean[],
    emit: (_event: string, payload: { attending: boolean }) =>
      socket.emitted.push(payload.attending),
    on: (event: string, listener: () => void) => socket.addEventListener(event, listener),
    off: (event: string, listener: () => void) => socket.removeEventListener(event, listener),
  });
  const state = { present: true };
  const posted: unknown[] = [];
  const exports = {} as { AttentionReporter: typeof AttentionReporter };

  runInNewContext(source, {
    exports,
    window,
    document,
    require: (name: string) =>
      ({
        react: { useEffect: (effect: () => void) => effect() },
        '@/features/realtime/stores/realtime-context': { useConnection: () => ({ socket }) },
        '@/shared/hooks/useIsAttending': { isPresent: () => state.present },
        '@ap-education/shell-sdk': { isNativeShell: () => native },
        '../api/attention': {
          reportAttention: (connection: typeof socket, attending: boolean) =>
            connection.emit('attention:update', { attending }),
          reportAttentionToShell: (attending: boolean) => posted.push(attending),
        },
      })[name],
  });
  exports.AttentionReporter();

  return {
    socket,
    posted,
    renew: () => tick!(),
    leave: () => {
      state.present = false;
      window.dispatchEvent(new Event('blur'));
    },
    disconnect: () => {
      socket.connected = false;
      socket.dispatchEvent(new Event('disconnect'));
    },
  };
}

test('a browser renews its lease while present and says once that it left', () => {
  const p = page();
  p.renew();
  p.leave();
  p.renew();

  assert.deepEqual(p.socket.emitted, [true, true, false]);
});

test('a dropped connection is not presence', () => {
  const p = page();
  p.disconnect();

  assert.deepEqual(p.socket.emitted, [true, false]);
});

test('inside the native shell only changes reach native, never the server', () => {
  const p = page({ native: true });
  p.renew();
  p.leave();

  assert.deepEqual(p.socket.emitted, []);
  assert.deepEqual(p.posted, [true, false]);
});
