import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type { CommunityServerToClientEvents } from '../src/features/communities/realtime/types';

type CreatedEvent = Parameters<CommunityServerToClientEvents['communities:changed']>[0];

function fixture() {
  let identity: string | undefined = 'viewer';
  let status = 'connected';
  const socket = { id: 'session-1' };
  const refreshedSession = { current: null };
  const refreshes: { identity: string; workspaceId?: string }[] = [];
  const effects: (() => void)[] = [];
  const handlers = new Map<string, (event?: CreatedEvent) => void>();
  const dependencies: Record<string, unknown> = {
    '@tanstack/react-query': { useQueryClient: () => 'query-client' },
    react: {
      useCallback: (callback: () => void) => callback,
      useEffect: (effect: () => void) => effects.push(effect),
      useRef: () => refreshedSession,
    },
    '@/features/auth/hooks/useQueryAuth': { useQueryAuth: () => ({ identity }) },
    '@/features/realtime/hooks/useSocketEvent': {
      useSocketEvent: (type: string, handler: (event?: CreatedEvent) => void) =>
        handlers.set(type, handler),
    },
    '@/features/realtime/stores/realtime-context': {
      useConnection: () => ({ status, socket }),
    },
    './channel-inventory-cache': {
      refreshChannelInventory: async (client: string, identity: string, workspaceId?: string) => {
        assert.equal(client, 'query-client');
        refreshes.push({ identity, workspaceId });
      },
    },
  };
  const exports: { ChannelListRealtime?: () => null } = {};
  const source = ts.transpileModule(
    readFileSync(
      new URL('../src/features/communities/realtime/ChannelListRealtime.tsx', import.meta.url),
      'utf8',
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  assert.ok(exports.ChannelListRealtime);
  const render = exports.ChannelListRealtime;
  return {
    render,
    refreshes,
    flush: () => effects.splice(0).forEach((effect) => effect()),
    emit: (type: string, event?: CreatedEvent) => {
      const handler = handlers.get(type);
      assert.ok(handler, `Missing listener for ${type}`);
      handler(event);
    },
    setIdentity: (value: string | undefined) => {
      identity = value;
    },
    setStatus: (value: string) => {
      status = value;
    },
    setSessionId: (value: string) => {
      socket.id = value;
    },
  };
}

test('server channel creation refreshes the receiving user workspace inventory', () => {
  const f = fixture();
  f.render();
  f.emit('communities:changed', {
    type: 'communities.channel.created',
    workspaceId: 'workspace',
    channelId: 'new-channel',
  });
  assert.deepEqual(f.refreshes, [{ identity: 'viewer', workspaceId: 'workspace' }]);
});

test('connect and session readiness refresh inventories only once per connection', () => {
  const f = fixture();
  f.setStatus('reconnecting');
  f.render();
  f.flush();
  assert.equal(f.refreshes.length, 0);
  f.setStatus('connected');
  f.render();
  f.flush();
  f.emit('session:ready');
  f.emit('session:ready');
  f.render();
  f.flush();
  assert.deepEqual(f.refreshes, [{ identity: 'viewer', workspaceId: undefined }]);

  f.setStatus('reconnecting');
  f.render();
  f.flush();
  f.setSessionId('session-2');
  f.setStatus('connected');
  f.render();
  f.emit('session:ready');
  f.flush();
  assert.deepEqual(f.refreshes, [
    { identity: 'viewer', workspaceId: undefined },
    { identity: 'viewer', workspaceId: undefined },
  ]);
});

test('connected state restores inventory when initial session readiness was missed', () => {
  const f = fixture();
  f.render();
  f.flush();
  assert.deepEqual(f.refreshes, [{ identity: 'viewer', workspaceId: undefined }]);
});

test('a changed identity refreshes its own inventory even on the same connection', () => {
  const f = fixture();
  f.render();
  f.flush();
  f.setIdentity('next-viewer');
  f.render();
  f.flush();
  f.emit('session:ready');
  assert.deepEqual(f.refreshes, [
    { identity: 'viewer', workspaceId: undefined },
    { identity: 'next-viewer', workspaceId: undefined },
  ]);
});

test('signed-out clients do not refresh a previous user inventory', () => {
  const f = fixture();
  f.setIdentity(undefined);
  f.render();
  f.flush();
  f.emit('communities:changed', {
    type: 'communities.channel.created',
    workspaceId: 'workspace',
    channelId: 'new-channel',
  });
  f.emit('session:ready');
  assert.deepEqual(f.refreshes, []);
});
