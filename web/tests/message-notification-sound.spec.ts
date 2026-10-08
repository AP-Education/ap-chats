import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type { UnreadMutation } from '../src/features/realtime/types';
import type { useMessageNotificationSound } from '../src/features/social/read-state/hooks/useMessageNotificationSound';
import type { getSharedAudioContext } from '../src/shared/audio/audio-context';

function load<T>(
  path: string,
  dependencies: Record<string, unknown>,
  globals: Record<string, unknown>,
): T {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return exports as T;
}

function fixture({
  native = false,
  openChannelId,
}: { native?: boolean; openChannelId?: string } = {}) {
  const window = new EventTarget();
  if (native) Object.assign(window, { ReactNativeWebView: {} });
  let userGesture = false;
  let createdContexts = 0;
  class AudioContext {
    state = 'suspended';
    constructor() {
      createdContexts++;
    }
    async resume() {
      if (userGesture) this.state = 'running';
    }
  }
  const audio = load<{ getSharedAudioContext: typeof getSharedAudioContext }>(
    '../src/shared/audio/audio-context.ts',
    {},
    { window, AudioContext },
  );
  const push = { enabled: false };
  const page = { visible: true };
  const sounds: string[] = [];
  let listener: ((event: UnreadMutation) => void) | undefined;
  const hook = load<{ useMessageNotificationSound: typeof useMessageNotificationSound }>(
    '../src/features/social/read-state/hooks/useMessageNotificationSound.ts',
    {
      react: { useEffect: (effect: () => void) => effect() },
      '@/features/notifications/hooks/usePush': { usePush: () => push },
      '@/features/realtime/hooks/useSocketEvent': {
        useSocketEvent: (event: string, handler: typeof listener) => {
          assert.equal(event, 'social:unread');
          listener = handler;
        },
      },
      '@/shared/audio/audio-context': audio,
      '@/shared/lib/nativeBridge': { isNativeShell: () => native },
      '@/shared/hooks/useIsAttending': {
        isAttending: () => page.visible,
        isPresent: () => page.visible,
      },
      '../sound/messageBloop': {
        playMessageBloop: () => {
          sounds.push(native ? 'native' : (audio.getSharedAudioContext()?.state ?? 'unavailable'));
        },
      },
    },
    { window },
  );
  hook.useMessageNotificationSound('workspace', openChannelId);
  return {
    push,
    page,
    sounds,
    createdContexts: () => createdContexts,
    interact: (type: string) => {
      userGesture = true;
      window.dispatchEvent(new Event(type));
      userGesture = false;
    },
    receive: (changes: Partial<UnreadMutation> = {}) => {
      assert.ok(listener);
      listener({
        workspaceId: 'workspace',
        channelId: 'channel',
        kind: 'dm',
        eventId: 'message-event',
        operation: 'append',
        subject: 'message',
        entries: [{ seq: '1', authorMemberId: 'author' }],
        alert: true,
        ...changes,
      });
    },
  };
}

test('the first interaction unlocks browser audio once, before any message arrives', () => {
  const f = fixture();

  f.interact('pointerdown');
  f.receive();
  f.receive();

  assert.deepEqual(f.sounds, ['running', 'running']);
  assert.equal(f.createdContexts(), 1);
});

test('a message plays only when the person is not reading that conversation', () => {
  const f = fixture({ openChannelId: 'channel' });

  f.receive();
  f.page.visible = false;
  f.receive();

  assert.equal(f.sounds.length, 1);
});

test('while browser push is on, a background tab stays silent and leaves it to the OS alert', () => {
  const f = fixture();
  f.push.enabled = true;

  f.page.visible = false;
  f.receive();
  f.page.visible = true;
  f.receive();

  assert.equal(f.sounds.length, 1);
});

test('muted messages never play', () => {
  const f = fixture();

  f.receive({ alert: false });

  assert.deepEqual(f.sounds, []);
});

// Presence silences the OS alert for every workspace, so the open app has to speak for them all.
test('another workspace plays even while the same channel is open here', () => {
  const f = fixture({ openChannelId: 'channel' });
  f.push.enabled = true;

  f.receive({ workspaceId: 'another-workspace' });

  assert.equal(f.sounds.length, 1);
});

test('the native shell plays its own sound without creating Web Audio', () => {
  const f = fixture({ native: true });

  f.receive();

  assert.deepEqual(f.sounds, ['native']);
  assert.equal(f.createdContexts(), 0);
});
