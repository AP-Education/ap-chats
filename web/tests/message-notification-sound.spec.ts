import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { matchPath } from 'react-router-dom';
import ts from 'typescript';

import type { MessageNotificationSound } from '../src/features/notifications/components/MessageNotificationSound';
import type { openConversationAt } from '../src/features/notifications/open-conversation';
import type { UnreadMutation } from '../src/features/realtime/types';
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
  pathname = '/channels',
  chatsInFront = true,
}: { native?: boolean; pathname?: string; chatsInFront?: boolean } = {}) {
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
  const routes = load<{ openConversationAt: typeof openConversationAt }>(
    '../src/features/notifications/open-conversation.ts',
    { 'react-router-dom': { matchPath } },
    {},
  );
  const sound = load<{ MessageNotificationSound: typeof MessageNotificationSound }>(
    '../src/features/notifications/components/MessageNotificationSound.tsx',
    {
      react: { useEffect: (effect: () => void) => effect() },
      'react-router-dom': { useLocation: () => ({ pathname }) },
      '../hooks/usePush': { usePush: () => push },
      '../open-conversation': routes,
      '@/features/realtime/hooks/useSocketEvent': {
        useSocketEvent: (event: string, handler: typeof listener) => {
          assert.equal(event, 'social:unread');
          listener = handler;
        },
      },
      '@/shared/audio/audio-context': audio,
      '@ap-education/shell-sdk': {
        isNativeShell: () => native,
        useIsAppActive: () => chatsInFront,
      },
      '@/shared/hooks/useIsAttending': { isAttending: () => page.visible },
      '../sound/messageBloop': {
        playMessageBloop: () => {
          sounds.push(native ? 'native' : (audio.getSharedAudioContext()?.state ?? 'unavailable'));
        },
      },
    },
    { window },
  );
  sound.MessageNotificationSound();
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
        entries: [{ seq: '1', authorMemberId: 'author', mentioned: false }],
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
  const f = fixture({ pathname: '/channels/channel' });

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
test('another workspace plays while a conversation is open here', () => {
  const f = fixture({ pathname: '/direct/channel' });
  f.push.enabled = true;

  f.receive({ workspaceId: 'another-workspace', channelId: 'another-channel' });

  assert.equal(f.sounds.length, 1);
});

test('an open conversation from another workspace stays quiet', () => {
  const f = fixture({ pathname: '/calls/channel' });

  f.receive({ workspaceId: 'another-workspace' });

  assert.deepEqual(f.sounds, []);
});

// The router keeps the last Chats page while another application is in front.
test('a conversation left open behind another application plays', () => {
  const f = fixture({ pathname: '/channels/channel', chatsInFront: false });

  f.receive();

  assert.equal(f.sounds.length, 1);
});

test('the native shell plays its own sound without creating Web Audio', () => {
  const f = fixture({ native: true });

  f.receive();

  assert.deepEqual(f.sounds, ['native']);
  assert.equal(f.createdContexts(), 0);
});
