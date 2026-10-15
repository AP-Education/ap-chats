import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { and, eq } from 'drizzle-orm';

import * as schema from '@/database/drizzle/schema';
import { seedConversations } from '@/testing/conversations';
import { migratedDatabase, transactionHost } from '@/testing/pglite';
import { socialServices } from '@/testing/social';

import { MESSAGE_CREATED_EVENT } from '../messages/events/message-created.event';
import type { ScheduleMessageDto } from './dto/scheduled-message.dto';
import { ChangeScheduledMessageDto } from './dto/scheduled-message.dto';
import { SCHEDULED_MESSAGES_CHANGED_EVENT } from './events/scheduled-messages-changed.event';
import { ScheduledDelivery } from './scheduled-delivery';

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000);

test('a change names new text, a new time, or both', () => {
  const errors = (body: object) =>
    validateSync(plainToInstance(ChangeScheduledMessageDto, body)).length;

  assert.equal(errors({}), 1);
  assert.equal(errors({ sendAt: 'next tuesday' }), 1);
  assert.equal(errors({ sendAt: minutesFromNow(5).toISOString() }), 0);
  assert.equal(errors({ markdown: 'Moved' }), 0);
});

test('scheduled messages on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const txHost = transactionHost(db);
  const seed = seedConversations(db);

  /** A private channel its creator runs, where an author schedules and a reader reads. */
  async function team() {
    const workspaceId = await seed.workspace();
    const creator = await seed.join(workspaceId, await seed.person('Chris'));
    const author = await seed.join(workspaceId, await seed.person('Ann'));
    const reader = await seed.join(workspaceId, await seed.person('Rob'));
    const { channelId } = await seed.channel(creator, 'private', [author, reader]);

    const services = socialServices(txHost);
    const deliveryErrors: unknown[] = [];
    const delivery = new ScheduledDelivery(services.scheduledMessages, services.scheduledSending, {
      error: (fields: unknown) => deliveryErrors.push(fields),
    } as never);

    const schedule = (markdown: string, extra: Partial<ScheduleMessageDto> = {}) =>
      services.scheduling.schedule(author, channelId, {
        markdown,
        clientNonce: randomUUID(),
        sendAt: minutesFromNow(30),
        ...extra,
      });
    // The clock reaching a message's time, without waiting for it.
    const timeComes = (id: string) =>
      db
        .update(schema.scheduledMessages)
        .set({ sendAt: new Date(Date.now() - 1000) })
        .where(eq(schema.scheduledMessages.id, id));
    const history = () =>
      db.select().from(schema.chatMessages).where(eq(schema.chatMessages.channelId, channelId));
    const postGrant = and(
      eq(schema.channelGrants.channelId, channelId),
      eq(schema.channelGrants.memberId, author.id),
      eq(schema.channelGrants.capability, 'post'),
    );
    const announced = () => services.published.map(({ name }) => name);

    return {
      workspaceId,
      channelId,
      author,
      reader,
      services,
      delivery,
      deliveryErrors,
      schedule,
      timeComes,
      history,
      postGrant,
      announced,
    };
  }

  await t.test(
    'a scheduled message joins the history at its time, once, and leaves the schedule',
    async () => {
      const chat = await team();
      const scheduled = await chat.schedule('Standup moves to eleven');

      assert.equal(await chat.delivery.deliver(), 0);
      assert.equal((await chat.history()).length, 0);
      assert.deepEqual(chat.announced(), [SCHEDULED_MESSAGES_CHANGED_EVENT]);

      await chat.timeComes(scheduled.id);
      assert.equal(await chat.delivery.deliver(), 1);
      assert.equal(await chat.delivery.deliver(), 0);

      const posted = await chat.history();
      assert.equal(posted.length, 1);
      assert.equal(posted[0]!.contentMarkdown, 'Standup moves to eleven');
      assert.equal(posted[0]!.authorMemberId, chat.author.id);
      assert.deepEqual(await chat.services.schedule.list(chat.author, chat.channelId), []);
      assert.deepEqual(chat.announced(), [
        SCHEDULED_MESSAGES_CHANGED_EVENT,
        MESSAGE_CREATED_EVENT,
        SCHEDULED_MESSAGES_CHANGED_EVENT,
      ]);

      const keptForPush = await db
        .select()
        .from(schema.eventOutbox)
        .where(eq(schema.eventOutbox.name, MESSAGE_CREATED_EVENT));
      assert.ok(
        keptForPush.some(
          ({ payload }) => (payload as { messageId: string }).messageId === posted[0]!.id,
        ),
      );
      assert.deepEqual(chat.deliveryErrors, []);
    },
  );

  await t.test('what cannot be scheduled is refused before it is kept', async () => {
    const chat = await team();

    await assert.rejects(
      chat.schedule('Too late', { sendAt: minutesFromNow(-1) }),
      BadRequestException,
    );
    await assert.rejects(
      chat.schedule('Too far', { sendAt: minutesFromNow(366 * 24 * 60) }),
      BadRequestException,
    );
    await assert.rejects(
      chat.schedule('With a file', { attachments: [{ id: randomUUID() }] }),
      BadRequestException,
    );
    await assert.rejects(
      chat.schedule('A reply to nothing', { replyToMessageId: randomUUID() }),
      NotFoundException,
    );

    assert.deepEqual(await chat.services.schedule.list(chat.author, chat.channelId), []);
  });

  await t.test(
    'a retried schedule keeps one message; its nonce reused for another conflicts',
    async () => {
      const chat = await team();
      const request = {
        markdown: 'Retro at 4',
        clientNonce: randomUUID(),
        sendAt: minutesFromNow(60),
      };

      const first = await chat.services.scheduling.schedule(chat.author, chat.channelId, request);
      const retry = await chat.services.scheduling.schedule(chat.author, chat.channelId, request);

      assert.equal(retry.id, first.id);
      assert.equal((await chat.services.schedule.list(chat.author, chat.channelId)).length, 1);
      await assert.rejects(
        chat.services.scheduling.schedule(chat.author, chat.channelId, {
          ...request,
          markdown: 'Something else',
        }),
        ConflictException,
      );
    },
  );

  await t.test('only its author sees, changes, sends or cancels a scheduled message', async () => {
    const chat = await team();
    const scheduled = await chat.schedule('Heads up');
    const { schedule, scheduledSending } = chat.services;

    assert.deepEqual(await schedule.list(chat.reader, chat.channelId), []);
    await assert.rejects(
      schedule.change(chat.reader, chat.channelId, scheduled.id, { markdown: 'Hijacked' }),
      NotFoundException,
    );
    await assert.rejects(
      schedule.cancel(chat.reader, chat.channelId, scheduled.id),
      NotFoundException,
    );
    await assert.rejects(
      scheduledSending.sendNow(chat.reader, chat.channelId, scheduled.id),
      NotFoundException,
    );

    const message = await scheduledSending.sendNow(chat.author, chat.channelId, scheduled.id);
    assert.equal(message.markdown, 'Heads up');
    assert.deepEqual(await schedule.list(chat.author, chat.channelId), []);
    await assert.rejects(
      scheduledSending.sendNow(chat.author, chat.channelId, scheduled.id),
      NotFoundException,
    );
  });

  await t.test(
    'a change takes the latest revision; a sent message has nothing to change',
    async () => {
      const chat = await team();
      const scheduled = await chat.schedule('Draft');
      const { schedule } = chat.services;
      const later = minutesFromNow(90);

      const changed = await schedule.change(chat.author, chat.channelId, scheduled.id, {
        markdown: 'Final',
        sendAt: later,
        revision: scheduled.revision,
      });
      assert.equal(changed.markdown, 'Final');
      assert.equal(changed.sendAt.getTime(), later.getTime());

      await assert.rejects(
        schedule.change(chat.author, chat.channelId, scheduled.id, {
          markdown: 'Stale',
          revision: scheduled.revision,
        }),
        ConflictException,
      );

      await chat.timeComes(scheduled.id);
      await chat.delivery.deliver();
      await assert.rejects(
        schedule.change(chat.author, chat.channelId, scheduled.id, { markdown: 'Too late' }),
        NotFoundException,
      );
      await assert.rejects(
        schedule.cancel(chat.author, chat.channelId, scheduled.id),
        NotFoundException,
      );
    },
  );

  await t.test(
    'one the channel no longer accepts fails at its time and waits; a new time tries again',
    async () => {
      const chat = await team();
      const scheduled = await chat.schedule('For the record');
      const [grant] = await db.delete(schema.channelGrants).where(chat.postGrant).returning();

      await chat.timeComes(scheduled.id);
      await chat.delivery.deliver();
      await chat.delivery.deliver();

      const [failed] = await chat.services.schedule.list(chat.author, chat.channelId);
      assert.equal(failed?.failure, 'You can only read this channel');
      assert.equal((await chat.history()).length, 0);

      await db.insert(schema.channelGrants).values(grant!);
      const retried = await chat.services.schedule.change(
        chat.author,
        chat.channelId,
        scheduled.id,
        {
          sendAt: minutesFromNow(1),
        },
      );
      assert.equal(retried.failure, null);

      await chat.timeComes(scheduled.id);
      await chat.delivery.deliver();
      assert.equal((await chat.history()).length, 1);
      assert.deepEqual(chat.deliveryErrors, []);
    },
  );
});
