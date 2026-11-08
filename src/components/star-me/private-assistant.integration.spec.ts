import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import { DrizzleChannelAccessRepository } from '@/components/communities/channel-access/channel-access/repository/drizzle-channel-access.repository';
import { ChannelAudienceFacade } from '@/components/communities/channel-audience';
import { DrizzleChannelAudienceRepository } from '@/components/communities/channel-audience/repository/drizzle-channel-audience.repository';
import { DrizzlePushAudienceRepository } from '@/components/notifications/alerts/repository/drizzle-push-audience.repository';
import { AttachmentDownloadsService } from '@/components/social/attachments/attachment-downloads.service';
import {
  MESSAGE_CREATED_EVENT,
  PRIVATE_MESSAGE_CREATED_EVENT,
} from '@/components/social/messages/events/message-created.event';
import { ChannelBroadcast } from '@/components/social/realtime/channel-broadcast';
import { SocialEventsRelay } from '@/components/social/realtime/social-events.relay';
import { DrizzleWorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import {
  channelEntries,
  channelMemberships,
  channels,
  chatMessages,
} from '@/database/drizzle/schema';
import { seedConversations } from '@/testing/conversations';
import { directMessageServices } from '@/testing/direct-messages';
import { migratedDatabase, transactionHost } from '@/testing/pglite';
import { socialServices } from '@/testing/social';

import { Assistant, type AssistantTurn } from './assistant';
import { DrizzleStarMeRepository } from './repository';
import { STAR_ME } from './star-me.identity';
import { answerNonce, StarMeService } from './star-me.service';
import { StarMeActivity } from './star-me-activity';

class RecordingAssistant extends Assistant {
  calls: { turns: AssistantTurn[]; token: string }[] = [];
  hold = Promise.resolve();
  async reply(turns: AssistantTurn[], token: string) {
    this.calls.push({ turns, token });
    await this.hold;
    return `Відповідь на ${turns.at(-1)?.text}`;
  }
}

test('private assistant exchanges and publication on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());
  const host = transactionHost(db);
  const seed = seedConversations(db);
  const social = socialServices(host);
  const direct = directMessageServices(host);
  const members = new DrizzleWorkspaceMembersRepository(host as never);
  const access = new ChannelAccessPolicy(new DrizzleChannelAccessRepository(host as never));
  const repository = new DrizzleStarMeRepository(host as never);
  await repository.saveIdentity(STAR_ME);
  const workspaceId = await seed.workspace();
  const alice = await seed.join(workspaceId, await seed.person('Олена'));
  const bob = await seed.join(workspaceId, await seed.person('Іван'));
  const manager = await seed.join(workspaceId, await seed.person('Менеджер'), 'manager');
  await repository.enrol(STAR_ME, workspaceId);
  const bot = (await members.findForUser(workspaceId, STAR_ME.subject))!;
  const assistant = new RecordingAssistant();
  const activity = new StarMeActivity();
  const service = new StarMeService(
    members,
    access,
    social.sending,
    repository,
    assistant,
    activity,
    social.events,
    { error() {} } as never,
  );
  const post = (member: WorkspaceMember, channelId: string, markdown: string, extra = {}) =>
    social.sending.send(member, channelId, { markdown, clientNonce: randomUUID(), ...extra });
  async function ask(member: WorkspaceMember, channelId: string, questionId: string) {
    await service.answer(member, channelId, { questionId }, `fixture-only:${member.id}`);
    const deadline = Date.now() + 5000;
    while (activity.isThinking(questionId)) {
      if (Date.now() > deadline) throw new Error('Assistant did not finish');
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const answerId = await repository.answerId(
      channelId,
      bot.id,
      answerNonce(questionId),
      questionId,
    );
    assert.ok(answerId);
    return answerId;
  }
  async function hiddenFrom(member: WorkspaceMember, channelId: string, messageId: string) {
    await assert.rejects(social.history.entry(member, channelId, messageId), NotFoundException);
    await assert.rejects(
      social.history.window(member, channelId, { messageId }),
      NotFoundException,
    );
    await assert.rejects(
      social.messages.requireLive({ workspaceId, channelId, messageId }, member.id),
      NotFoundException,
    );
  }

  for (const kind of ['dm', 'group'] as const) {
    await t.test(
      `${kind}: only the asker sees questions, answers and status; publication replaces the original`,
      async () => {
        const conversation =
          kind === 'dm'
            ? await seed.conversation(alice, bob)
            : await seed.channel(alice, 'public', [bob, manager]);
        const { channelId } = conversation;
        const publicMessage = await post(alice, channelId, 'Спільне повідомлення');
        const question = await post(alice, channelId, `:member[${bot.id}] приватний запит`, {
          contextMessageIds: [publicMessage.id],
        });
        assert.equal(question.privateToMe, true);
        const answerId = await ask(alice, channelId, question.id);
        const mine = await social.history.window(alice, channelId, {});
        assert.equal(mine.items.length, 3);
        for (const id of [question.id, answerId]) await hiddenFrom(bob, channelId, id);
        if (kind === 'group')
          for (const id of [question.id, answerId]) await hiddenFrom(manager, channelId, id);
        const theirs = await social.history.window(bob, channelId, {});
        assert.deepEqual(
          theirs.items.map(({ id }) => id),
          [publicMessage.id],
        );
        assert.equal((await service.status(bob, channelId)).questions.length, 0);
        await assert.rejects(
          social.publication.publish(bob, channelId, answerId),
          NotFoundException,
        );
        await assert.rejects(
          social.publication.publish(alice, channelId, question.id),
          NotFoundException,
        );
        await assert.rejects(
          social.forwarding.forward(alice, {
            sourceChannelId: channelId,
            messageIds: [answerId],
            batchNonce: randomUUID(),
            target: { kind: 'channel', id: channelId },
          }),
          BadRequestException,
        );
        await assert.rejects(
          social.reactions.react(alice, channelId, answerId, '👍'),
          BadRequestException,
        );
        await assert.rejects(social.pins.add(alice, channelId, answerId), BadRequestException);
        const [before] = await db.select().from(chatMessages).where(eq(chatMessages.id, answerId));
        const beforeSeq = (await social.history.entry(alice, channelId, answerId)).seq;
        const createdBefore = social.published.filter(
          ({ name }) => name === MESSAGE_CREATED_EVENT,
        ).length;
        const converted = await Promise.all([
          social.publication.publish(alice, channelId, answerId),
          social.publication.publish(alice, channelId, answerId),
        ]);
        assert.equal(converted[0]!.id, answerId);
        assert.equal(converted[1]!.seq, converted[0]!.seq);
        assert.ok(BigInt(converted[0]!.seq) > BigInt(beforeSeq));
        assert.equal(converted[0]!.authorMemberId, alice.id);
        assert.equal(converted[0]!.privateToMe, false);
        assert.equal(converted[0]!.replyToMessageId, null);
        const visible = await social.history.entry(bob, channelId, answerId);
        assert.equal(visible.type, 'MESSAGE');
        if (visible.type === 'MESSAGE') {
          assert.equal(visible.author.memberId, alice.id);
          assert.equal(visible.context, null);
          assert.equal(visible.reply, null);
          assert.equal(visible.message.markdown, before!.contentMarkdown);
        }
        await hiddenFrom(bob, channelId, question.id);
        const [after] = await db.select().from(chatMessages).where(eq(chatMessages.id, answerId));
        assert.ok(after!.publishedAt);
        assert.equal(after!.assistantQuestionId, question.id);
        assert.equal(after!.assistantOriginalSeq, BigInt(beforeSeq));
        assert.equal(
          social.published.filter(({ name }) => name === MESSAGE_CREATED_EVENT).length,
          createdBefore + 1,
        );
        const calls = assistant.calls.length;
        await service.answer(alice, channelId, { questionId: question.id }, 'fixture-only:retry');
        assert.equal(assistant.calls.length, calls);
        assert.equal(
          (await db.select().from(channelEntries).where(eq(channelEntries.messageId, answerId)))
            .length,
          1,
        );
        await assert.rejects(
          service.answer(alice, channelId, { questionId: answerId }, 'fixture-only:invalid'),
          NotFoundException,
        );
      },
    );
  }

  await t.test(
    'private exchanges stay out of another person’s AI context, unread, push and inbox preview',
    async () => {
      const { channelId } = await seed.conversation(alice, manager);
      const publicMessage = await post(alice, channelId, 'Публічний контекст');
      const baseline = await social.readState.workspace(manager);
      const [before] = await db.select().from(channels).where(eq(channels.id, channelId));
      const privateAlice = await post(alice, channelId, 'Секрет Олени', { assistant: true });
      const answerAlice = await ask(alice, channelId, privateAlice.id);
      const privateManager = await post(manager, channelId, 'Секрет менеджера', {
        assistant: true,
      });
      await ask(manager, channelId, privateManager.id);
      const last = assistant.calls.at(-1)!.turns;
      assert.ok(last.every(({ text }) => !text.includes('Секрет Олени')));
      assert.deepEqual(await social.readState.workspace(manager), baseline);
      const [after] = await db.select().from(channels).where(eq(channels.id, channelId));
      assert.equal(after!.updatedAt.getTime(), before!.updatedAt.getTime());
      assert.equal(after!.lastPublicEntrySeq, BigInt(publicMessage.seq));
      const inbox = await direct.inbox.get(manager.profile.oidcUserId, channelId);
      assert.ok(!inbox.lastMessage?.markdown?.includes('Олени'));
      const push = new DrizzlePushAudienceRepository(host as never);
      const range = {
        workspaceId,
        channelId,
        firstSeq: (BigInt(publicMessage.seq) + 1n).toString(),
        lastSeq: after!.lastEntrySeq.toString(),
      };
      assert.equal(await push.latestMessageAt(range), undefined);
      assert.deepEqual(await push.recipients(range), []);
      const receiptOffset = social.published.length;
      await social.readState.markRead(
        alice,
        channelId,
        (await social.history.entry(alice, channelId, answerAlice)).seq,
      );
      const firstReceipt = social.published
        .slice(receiptOffset)
        .find(({ name }) => name === 'social.read-state.receipt');
      assert.equal((firstReceipt?.event as { seq: string }).seq, publicMessage.seq);
      const questionBeforePublication = await post(alice, channelId, 'Продовжимо', {
        assistant: true,
      });
      const secondOffset = social.published.length;
      await social.readState.markRead(alice, channelId, questionBeforePublication.seq);
      assert.ok(
        social.published
          .slice(secondOffset)
          .every(({ name }) => name !== 'social.read-state.receipt'),
      );
      assert.equal(
        (await social.history.window(manager, channelId, {})).peerReadSeq,
        publicMessage.seq,
      );
      await social.publication.publish(alice, channelId, answerAlice);
      await ask(alice, channelId, questionBeforePublication.id);
      const ownTurns = assistant.calls.at(-1)!.turns;
      assert.ok(
        ownTurns.some((turn) => turn.role === 'assistant' && turn.text.includes('Секрет Олени')),
      );
      assert.ok(ownTurns.every(({ text }) => !text.includes('Секрет менеджера')));
    },
  );

  await t.test(
    'private entry IDs cannot be used for attachments, public replies or context by another participant',
    async () => {
      const { channelId } = await seed.conversation(bob, manager);
      const question = await post(bob, channelId, 'Приватний файл', { assistant: true });
      let signed = false;
      const downloads = new AttachmentDownloadsService(
        access,
        social.messages,
        {} as never,
        {
          signDownload() {
            signed = true;
            return Promise.resolve('https://fixture.test');
          },
        } as never,
      );
      await assert.rejects(
        downloads.link(
          manager,
          { workspaceId, channelId, messageId: question.id },
          randomUUID(),
          'download',
        ),
        NotFoundException,
      );
      assert.equal(signed, false);
      await assert.rejects(
        post(manager, channelId, 'Вгадана цитата', { replyToMessageId: question.id }),
        NotFoundException,
      );
      const ordinary = await post(manager, channelId, 'Тільки публічний контекст', {
        contextMessageIds: [question.id],
      });
      const item = await social.history.entry(manager, channelId, ordinary.id);
      assert.equal(item.type, 'MESSAGE');
      if (item.type === 'MESSAGE') assert.equal(item.context, null);
      const nonce = randomUUID();
      await social.sending.send(bob, channelId, {
        markdown: 'Приватна чернетка',
        assistant: true,
        clientNonce: nonce,
      });
      await assert.rejects(
        social.sending.send(bob, channelId, { markdown: 'Приватна чернетка', clientNonce: nonce }),
        ConflictException,
      );
    },
  );

  await t.test(
    'private edits and mixed deletions never announce private IDs publicly; scheduling cannot discard privacy',
    async () => {
      const { channelId } = await seed.channel(alice, 'public', [bob, manager]);
      const ordinary = await post(alice, channelId, 'Для всіх');
      await assert.rejects(
        social.editing.edit(alice, channelId, ordinary.id, {
          markdown: `:member[${bot.id}] редагований запит`,
        }),
        BadRequestException,
      );
      const question = await post(alice, channelId, 'Приватне', { assistant: true });
      const answer = await ask(alice, channelId, question.id);
      await assert.rejects(
        social.editing.edit(bob, channelId, question.id, { markdown: 'Чужа зміна' }),
        NotFoundException,
      );
      await social.editing.edit(alice, channelId, question.id, {
        markdown: 'Змінений приватний запит',
      });
      const update = social.published.at(-1)!;
      assert.equal(update.name, 'social.message.updated.private');
      await hiddenFrom(bob, channelId, question.id);
      await assert.rejects(
        social.scheduling.schedule(alice, channelId, {
          markdown: 'Приватна чернетка',
          assistant: true,
          clientNonce: randomUUID(),
          sendAt: new Date(Date.now() + 600_000),
        }),
        BadRequestException,
      );
      const offset = social.published.length;
      await social.deleting.delete(alice, channelId, [ordinary.id, question.id, answer]);
      const publicEvents = social.published
        .slice(offset)
        .filter(({ name }) => !name.endsWith('.private'));
      assert.equal(publicEvents.length, 1);
      assert.ok(!JSON.stringify(publicEvents).includes(question.id));
      assert.ok(!JSON.stringify(publicEvents).includes(answer));
      await assert.rejects(social.publication.publish(alice, channelId, answer), NotFoundException);
      const otherGroup = await seed.channel(alice, 'public', [bob]);
      const otherQuestion = await post(alice, otherGroup.channelId, 'До відкликання доступу', {
        assistant: true,
      });
      const otherAnswer = await ask(alice, otherGroup.channelId, otherQuestion.id);
      await db
        .delete(channelMemberships)
        .where(
          and(
            eq(channelMemberships.channelId, otherGroup.channelId),
            eq(channelMemberships.memberId, alice.id),
          ),
        );
      await assert.rejects(social.publication.publish(alice, otherGroup.channelId, otherAnswer));
      const [unchanged] = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, otherAnswer));
      assert.equal(unchanged!.publishedAt, null);
    },
  );

  await t.test(
    'thinking status is visible only to the asker while the answer is in flight',
    async () => {
      const { channelId } = await seed.channel(alice, 'public', [bob, manager]);
      const question = await post(alice, channelId, 'Приватне очікування', { assistant: true });
      let release!: () => void;
      assistant.hold = new Promise<void>((resolve) => {
        release = resolve;
      });
      try {
        await service.answer(alice, channelId, { questionId: question.id }, 'fixture-only:held');
        assert.deepEqual(
          (await service.status(alice, channelId)).questions.map((item) => item.questionId),
          [question.id],
        );
        assert.deepEqual((await service.status(bob, channelId)).questions, []);
        assert.deepEqual((await service.status(manager, channelId)).questions, []);
      } finally {
        release();
        assistant.hold = Promise.resolve();
      }
      await ask(alice, channelId, question.id);
    },
  );

  await t.test(
    'realtime admission sends private content only to its owner, even among channel watchers',
    async () => {
      const group = await seed.channel(alice, 'public', [bob, manager]);
      const question = await post(alice, group.channelId, 'Realtime secret', { assistant: true });
      const event = social.published.findLast(
        ({ name, event }) =>
          name === PRIVATE_MESSAGE_CREATED_EVENT &&
          (event as { messageId: string }).messageId === question.id,
      )!.event;
      const audience = new ChannelAudienceFacade(
        new DrizzleChannelAudienceRepository(host as never),
      );
      let recipients: string[] = [];
      const realtime = {
        async toWatchers(
          _room: string,
          _name: string,
          _payload: unknown,
          admit: (ids: string[]) => Promise<string[]>,
        ) {
          recipients = await admit([alice, bob, manager].map(({ profile }) => profile.oidcUserId));
        },
      };
      const broadcast = new ChannelBroadcast(realtime as never, audience, {
        child() {
          return { error() {} };
        },
      } as never);
      const relay = new SocialEventsRelay(broadcast, realtime as never);
      await relay.onPrivateMessageCreated(event as never);
      assert.deepEqual(recipients, [alice.profile.oidcUserId]);
      await db
        .delete(channelMemberships)
        .where(
          and(
            eq(channelMemberships.channelId, group.channelId),
            eq(channelMemberships.memberId, alice.id),
          ),
        );
      await relay.onPrivateMessageCreated(event as never);
      assert.deepEqual(recipients, []);
    },
  );
});
