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
      '@/features/devices/browser-push': { useWebPush: () => push },
      '@/features/realtime/hooks/useSocketEvent': {
        useSocketEvent: (event: string, handler: typeof listener) => {
          assert.equal(event, 'social:unread');
          listener = handler;
        },
      },
      '@/shared/audio/audio-context': audio,
      '@/shared/hooks/useIsAttending': { isAttending: () => page.visible },
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

for (const gesture of ['pointerdown', 'keydown']) {
  test(`the first ${gesture} unlocks browser audio before any notification arrives`, () => {
    const f = fixture();
    f.interact(gesture);
    assert.equal(f.sounds.length, 0);
    f.receive();
    assert.deepEqual(f.sounds, ['running']);
    f.receive();
    assert.deepEqual(f.sounds, ['running', 'running']);
    assert.equal(f.createdContexts(), 1);
  });
}

test('foreground message sound works with browser push disabled', () => {
  const f = fixture();
  f.interact('pointerdown');
  f.receive();
  assert.deepEqual(f.sounds, ['running']);
});

test('messages in the visible open conversation stay silent', () => {
  const f = fixture({ openChannelId: 'channel' });
  f.receive();
  assert.deepEqual(f.sounds, []);
  f.page.visible = false;
  f.receive();
  assert.equal(f.sounds.length, 1);
});

test('background browser push suppresses duplicate local sound', () => {
  const f = fixture();
  f.push.enabled = true;
  f.page.visible = false;
  f.receive();
  assert.deepEqual(f.sounds, []);
  f.page.visible = true;
  f.receive();
  assert.equal(f.sounds.length, 1);
});

test('muted or unrelated workspace events do not play sound', () => {
  const f = fixture();
  f.receive({ alert: false });
  f.receive({ workspaceId: 'another-workspace' });
  assert.deepEqual(f.sounds, []);
});

test('the native shell keeps its native sound without creating Web Audio', () => {
  const f = fixture({ native: true });
  f.receive();
  assert.deepEqual(f.sounds, ['native']);
  assert.equal(f.createdContexts(), 0);
});
