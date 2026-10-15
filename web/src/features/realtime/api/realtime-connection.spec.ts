import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { RealtimeSocketClient } from '../types';
import { RealtimeConnection } from './realtime-connection';

type Handler = (...args: never[]) => void;

/** A socket the test drives by hand: it records what it was asked to connect with. */
function fakeSocket() {
  const handlers = new Map<string, Handler>();
  const attempts: string[] = [];
  let getToken: () => string = () => '';
  const socket = {
    connected: false,
    active: false,
    on: (event: string, handler: Handler) => handlers.set(event, handler),
    off: (event: string) => handlers.delete(event),
    connect() {
      socket.active = true;
      attempts.push(getToken());
      return socket;
    },
    disconnect() {
      socket.active = false;
      socket.connected = false;
      return socket;
    },
  };
  const emit = (event: string, ...args: unknown[]) =>
    (handlers.get(event) as ((...values: unknown[]) => void) | undefined)?.(...args);

  return {
    attempts,
    create: (tokenSource: () => string) => {
      getToken = tokenSource;
      return socket as unknown as RealtimeSocketClient;
    },
    refuse(code: string) {
      socket.active = false;
      emit('connect_error', Object.assign(new Error(code), { data: { code } }));
    },
    accept() {
      socket.connected = true;
      emit('connect');
    },
  };
}

async function settle() {
  for (let step = 0; step < 8; step++) await Promise.resolve();
}

function connectionWith(renew?: () => Promise<string>) {
  const socket = fakeSocket();
  const connection = new RealtimeConnection('first', renew, socket.create);
  Object.assign(globalThis, {
    document: { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' },
  });
  connection.open();
  return { socket, connection };
}

test('an expired token is renewed once and the socket reconnects with the new one', async () => {
  let renewals = 0;
  const { socket, connection } = connectionWith(async () => `renewed-${++renewals}`);

  socket.refuse('AUTH_TOKEN_EXPIRED');
  await settle();
  socket.accept();

  assert.deepEqual(socket.attempts, ['first', 'renewed-1']);
  assert.equal(connection.getState().status, 'connected');
});

test('a renewed token refused as well is not renewed again, the next token from the shell is tried', async () => {
  let renewals = 0;
  const { socket, connection } = connectionWith(async () => `renewed-${++renewals}`);

  socket.refuse('AUTH_TOKEN_EXPIRED');
  await settle();
  socket.refuse('AUTH_TOKEN_EXPIRED');
  await settle();
  assert.equal(renewals, 1);
  assert.equal(connection.getState().status, 'error');

  connection.setToken('from-shell');
  assert.deepEqual(socket.attempts, ['first', 'renewed-1', 'from-shell']);
});

test('an invalid token is never renewed, and a failed renewal waits for the shell', async () => {
  let renewals = 0;
  const invalid = connectionWith(async () => `renewed-${++renewals}`);
  invalid.socket.refuse('AUTH_TOKEN_INVALID');
  await settle();
  assert.equal(renewals, 0);
  assert.deepEqual(invalid.socket.attempts, ['first']);

  const failing = connectionWith(async () => {
    throw new Error('Session ended');
  });
  failing.socket.refuse('AUTH_TOKEN_EXPIRED');
  await settle();
  assert.equal(failing.connection.getState().status, 'error');
  assert.deepEqual(failing.socket.attempts, ['first']);
});

test('a token the socket is already retrying with on its own does not start a second attempt', () => {
  const { socket, connection } = connectionWith();

  connection.setToken('renewed by the shell');

  assert.deepEqual(socket.attempts, ['first']);
});
