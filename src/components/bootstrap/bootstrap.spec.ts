import assert from 'node:assert/strict';
import { createServer, type Server as HttpServer } from 'node:http';
import { after, before, test } from 'node:test';

import { Server } from 'socket.io';
import { io, type Socket as ClientSocket } from 'socket.io-client';

import type { AccountsTokenVerifier } from '@/components/auth';
import type { Logger } from '@/globals/logger';
import { RealtimeRooms, SocketIoRealtimePublisher } from '@/globals/realtime';

import { BootstrapGateway } from './bootstrap.gateway';

let httpServer: HttpServer;
let socketServer: Server;
let endpoint: string;
const clients: ClientSocket[] = [];
const publisher = new SocketIoRealtimePublisher();

before(async () => {
  httpServer = createServer();
  socketServer = new Server(httpServer);

  const verifier = {
    async verify(token: string) {
      if (token === 'alice' || token === 'bob') {
        return { sub: token, appId: 'connect-app' };
      }
      if (token === 'expired') {
        const error = new Error('jwt expired') as Error & { code?: string };
        error.code = 'ERR_JWT_EXPIRED';
        throw error;
      }
      throw new Error('Invalid token');
    },
  } as AccountsTokenVerifier;
  const logger = { child: () => ({ warn() {}, error() {} }) } as unknown as Logger;
  const gateway = new BootstrapGateway(verifier, publisher, logger);
  const namespace = socketServer.of('/connect');
  gateway.afterInit(namespace);
  namespace.on('connection', (socket) => {
    void gateway.handleConnection(socket);
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', resolve);
  });
  const address = httpServer.address();
  assert.ok(address && typeof address !== 'string');
  endpoint = `http://127.0.0.1:${address.port}/connect`;
});

after(async () => {
  for (const client of clients) client.disconnect();
  await new Promise<void>((resolve) => socketServer.close(() => resolve()));
});

function client(token?: string): ClientSocket {
  const socket = io(endpoint, {
    auth: token ? { token } : {},
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    transports: ['websocket'],
  });
  clients.push(socket);
  return socket;
}

function connect(socket: ClientSocket): Promise<{ userId: string; appId: string }> {
  return new Promise((resolve, reject) => {
    socket.once('session:ready', resolve);
    socket.once('connect_error', reject);
    socket.connect();
  });
}

test('authenticates a socket and joins only its user room', { timeout: 5000 }, async () => {
  const alice = client('alice');
  assert.deepEqual(await connect(alice), { userId: 'alice', appId: 'connect-app' });

  const namespace = socketServer.of('/connect');
  assert.equal(namespace.adapter.rooms.get(RealtimeRooms.user('connect-app', 'alice'))?.size, 1);
  assert.equal(namespace.adapter.rooms.has(RealtimeRooms.user('connect-app', 'bob')), false);
  assert.equal(
    namespace.adapter.rooms.has(RealtimeRooms.conversation('connect-app', 'some-id')),
    false,
  );
});

test('delivers a personal event to every device of that user', { timeout: 5000 }, async () => {
  const first = client('alice');
  const second = client('alice');
  const other = client('bob');
  await Promise.all([connect(first), connect(second), connect(other)]);

  const firstEvent = new Promise<unknown>((resolve) => first.once('notice', resolve));
  const secondEvent = new Promise<unknown>((resolve) => second.once('notice', resolve));
  const unexpected: unknown[] = [];
  other.on('notice', (payload) => unexpected.push(payload));

  publisher.toUser('connect-app', 'alice', 'notice', { id: 'notice-1' });
  assert.deepEqual(await firstEvent, { id: 'notice-1' });
  assert.deepEqual(await secondEvent, { id: 'notice-1' });
  assert.deepEqual(unexpected, []);
});

test('rejects missing and invalid handshake tokens before joining', { timeout: 5000 }, async () => {
  const missing = client();
  await assert.rejects(connect(missing), (error: Error & { data?: { code?: string } }) => {
    assert.equal(error.data?.code, 'AUTH_TOKEN_MISSING');
    return true;
  });

  const invalid = client('invalid');
  await assert.rejects(connect(invalid), (error: Error & { data?: { code?: string } }) => {
    assert.equal(error.data?.code, 'AUTH_TOKEN_INVALID');
    return true;
  });
});

test('classifies an already-expired handshake token', { timeout: 5000 }, async () => {
  const expired = client('expired');
  await assert.rejects(connect(expired), (error: Error & { data?: { code?: string } }) => {
    assert.equal(error.data?.code, 'AUTH_TOKEN_EXPIRED');
    return true;
  });
});
