import '../../../src/testing/test-env.ts';

import { HttpException } from '@nestjs/common';
import Fastify from 'fastify';

import { ChannelAccessPolicy } from '../../../src/components/communities/channel-access/channel-access';
import { DrizzleChannelAccessRepository } from '../../../src/components/communities/channel-access/channel-access/repository/drizzle-channel-access.repository';
import { DrizzleMentionsRepository } from '../../../src/components/social/mentions/repository/drizzle-mentions.repository';
import {
  Assistant,
  AssistantFailure,
  type AssistantTurn,
} from '../../../src/components/star-me/assistant';
import { DrizzleStarMeRepository } from '../../../src/components/star-me/repository';
import { STAR_ME } from '../../../src/components/star-me/star-me.identity';
import { StarMeService } from '../../../src/components/star-me/star-me.service';
import { StarMeActivity } from '../../../src/components/star-me/star-me-activity';
import { DrizzleWorkspaceMembersRepository } from '../../../src/components/workspaces/members/repository';
import { seedConversations } from '../../../src/testing/conversations';
import { directMessageServices } from '../../../src/testing/direct-messages';
import { migratedDatabase, transactionHost } from '../../../src/testing/pglite';
import { socialServices } from '../../../src/testing/social';

// Local disposable database and deterministic agent; never loads application dotenv files.
async function main() {
  const { pg, db } = await migratedDatabase();
  const host = transactionHost(db);
  const seed = seedConversations(db);
  const social = socialServices(host);
  const direct = directMessageServices(host);
  const repository = new DrizzleStarMeRepository(host as never);
  const mentions = new DrizzleMentionsRepository(host as never);
  const members = new DrizzleWorkspaceMembersRepository(host as never);
  const access = new ChannelAccessPolicy(new DrizzleChannelAccessRepository(host as never));
  const attempts = new Map<string, number>();
  const replyGates = new Map<string, { ready: Promise<void>; release: () => void }>();
  const activity = new StarMeActivity();
  class FixtureAssistant extends Assistant {
    async reply(turns: AssistantTurn[], token: string) {
      const text = turns.at(-1)?.text ?? '';
      const key = `${token}:${text}`;
      const count = attempts.get(key) ?? 0;
      attempts.set(key, count + 1);
      await replyGates.get(token)?.ready;
      await new Promise((resolve) => setTimeout(resolve, 900));
      if (text.includes('Помилка') && count === 0) throw new AssistantFailure('unavailable');
      return `Привіт! Допоможу з вашим запитом: ${text}`;
    }
  }
  const service = new StarMeService(
    members,
    access,
    social.sending,
    repository,
    new FixtureAssistant(),
    activity,
    social.events,
    { error() {} } as never,
  );
  await repository.saveIdentity(STAR_ME);

  async function createSession() {
    const workspaceId = await seed.workspace();
    const user = await seed.join(workspaceId, await seed.person('Олена Коваль'));
    const manager = await seed.join(workspaceId, await seed.person('Менеджер'), 'manager');
    const peer = await seed.join(workspaceId, await seed.person('Іван Петренко'));
    await repository.enrol(STAR_ME, workspaceId);
    const starMe = (await members.findForUser(workspaceId, STAR_ME.subject))!;
    const other = await direct.conversations.open(user, peer.id);
    const group = await seed.channel(user, 'public', [peer, manager]);
    return {
      workspaceId,
      user,
      starMe,
      other,
      peer,
      manager,
      group: { channelId: group.channelId },
    };
  }
  type Session = Awaited<ReturnType<typeof createSession>>;
  const sessions = new Map<string, Promise<Session>>();
  const results = new Map<string, unknown>();
  const api = Fastify();
  api.setErrorHandler((error, _request, reply) => {
    reply
      .code(error instanceof HttpException ? error.getStatus() : 500)
      .send({ message: error.message });
  });
  api.addHook('onRequest', async (request, reply) => {
    if (!/^Bearer fixture-only:[a-zA-Z0-9_-]{1,80}$/u.test(request.headers.authorization ?? ''))
      return reply.code(401).send({ message: 'Disposable QA authorization required' });
  });
  function session(token: string) {
    token = token.replace(/_(peer|manager)$/u, '');
    let value = sessions.get(token);
    if (!value) {
      value = createSession();
      sessions.set(token, value);
    }
    return value;
  }
  api.all('/api/*', async (request, reply) => {
    const token = request.headers.authorization!.slice(7);
    const state = await session(token);
    const actor = token.endsWith('_peer')
      ? state.peer
      : token.endsWith('_manager')
        ? state.manager
        : state.user;
    const path = request.url.split('?')[0]!;
    const body = request.body as Record<string, string> | undefined;
    const channelId = path.match(/\/channels\/([^/]+)/u)?.[1];
    if (path === '/api/qa/assistant' && request.method === 'POST') {
      if (body?.command === 'pause') {
        if (!replyGates.has(token)) {
          let release!: () => void;
          const ready = new Promise<void>((resolve) => {
            release = resolve;
          });
          replyGates.set(token, { ready, release });
        }
      } else if (body?.command === 'resume') {
        replyGates.get(token)?.release();
        replyGates.delete(token);
      } else return reply.code(400).send({ message: 'Unknown QA assistant command' });
      return { ok: true };
    }
    if (path === '/api/qa/session') return { ...state, user: actor };
    if (path === '/api/qa/result' && request.method === 'POST') {
      results.set(token, request.body);
      return { ok: true };
    }
    if (path === '/api/qa/results') return Object.fromEntries(results);
    if (path.endsWith('/members')) return members.findAllForWorkspace(state.workspaceId);
    if (channelId && path.endsWith('/mention-candidates')) {
      await access.requireViewAccess(actor, channelId);
      return mentions.candidates(
        state.workspaceId,
        channelId,
        new URL(request.url, 'http://fixture.test').searchParams.get('q') ?? '',
      );
    }
    if (path.endsWith('/direct-messages') && request.method === 'POST')
      return direct.conversations.open(actor, body!.memberId!);
    if (path.endsWith('/uploads/policy'))
      return {
        maxFileBytes: 20 * 1024 * 1024,
        maxMessageBytes: 20 * 1024 * 1024,
        maxFiles: 10,
        partBytes: 5 * 1024 * 1024,
      };
    if (channelId && path.endsWith('/messages') && request.method === 'POST')
      return social.sending.send(actor, channelId, body as never);
    const makeOwn = path.match(/\/messages\/([^/]+)\/make-own$/u);
    if (channelId && makeOwn && request.method === 'POST')
      return social.publication.publish(actor, channelId, makeOwn[1]!);
    if (channelId && path.endsWith('/messages/window'))
      return social.history.window(
        actor,
        channelId,
        Object.fromEntries(new URL(request.url, 'http://fixture.test').searchParams),
      );
    const entry = path.match(/\/messages\/([^/]+)$/u);
    if (channelId && entry && request.method === 'GET')
      return social.history.entry(actor, channelId, entry[1]!);
    if (channelId && path.endsWith('/messages') && request.method === 'GET')
      return social.history.page(
        actor,
        channelId,
        Object.fromEntries(new URL(request.url, 'http://fixture.test').searchParams),
      );
    if (channelId && path.endsWith('/star-me/answers')) {
      await service.answer(actor, channelId, body as never, token);
      return reply.code(204).send();
    }
    if (channelId && path.endsWith('/star-me/status')) return service.status(actor, channelId);
    if (channelId && path.endsWith('/qa-history')) {
      return (await social.history.window(actor, channelId, {})).items;
    }
    if (path === '/api/qa/events')
      return social.published
        .filter(({ event }) => {
          const scoped = event as { workspaceId?: string; privateToUserId?: string };
          return (
            scoped.workspaceId === state.workspaceId &&
            (!scoped.privateToUserId || scoped.privateToUserId === actor.profile.oidcUserId)
          );
        })
        .map(({ name, event }) => ({ name: name.replace(/\.private$/u, ''), event }));
    return reply.code(404).send({ message: 'Not in the isolated fixture API' });
  });
  api.addHook('onClose', () => pg.close());
  await api.listen({ port: 5576, host: '127.0.0.1' });
  console.log('StarMe disposable QA API: http://127.0.0.1:5576');
}
void main();
