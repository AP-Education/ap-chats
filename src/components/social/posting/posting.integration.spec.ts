import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { eq } from 'drizzle-orm';

import type { WorkspaceMember } from '@/components/workspaces/members/types';
import * as schema from '@/database/drizzle/schema';
import { seedConversations } from '@/testing/conversations';
import { migratedDatabase, transactionHost } from '@/testing/pglite';
import { socialServices } from '@/testing/social';

import { FORWARD_BATCH_CREATED_EVENT } from '../forwarding/events/forward-batch-created.event';
import { MESSAGE_CREATED_EVENT } from '../messages/events/message-created.event';
import { MESSAGE_DELETED_EVENT } from '../messages/events/message-deleted.event';
import { BatchDeleteMessagesDto, SendMessageDto } from './dto/send-message.dto';

test('a quote needs the message it replies to, and a batch delete names each message once', () => {
  const sendErrors = (body: object) =>
    validateSync(
      plainToInstance(SendMessageDto, { markdown: 'Noted', clientNonce: randomUUID(), ...body }),
    );
  const deleteErrors = (messageIds: string[]) =>
    validateSync(plainToInstance(BatchDeleteMessagesDto, { messageIds }));

  assert.equal(sendErrors({ quoteText: 'Friday' }).length, 1);
  assert.equal(sendErrors({ quoteText: '   ' }).length, 0, 'a blank quote is no quote');
  assert.equal(sendErrors({ quoteText: 'Friday', replyToMessageId: randomUUID() }).length, 0);

  const id = randomUUID();
  assert.equal(deleteErrors([]).length, 1);
  assert.equal(deleteErrors([id, id]).length, 1);
  assert.equal(deleteErrors([id]).length, 0);
});

test('posting messages on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const txHost = transactionHost(db);
  const seed = seedConversations(db);

  /** A workspace owner, a channel creator and two members, each with services of their own. */
  async function team(kind: 'public' | 'private' = 'public') {
    const workspaceId = await seed.workspace();
    const owner = await seed.join(workspaceId, await seed.person('Olga'), 'owner');
    const creator = await seed.join(workspaceId, await seed.person('Chris'));
    const author = await seed.join(workspaceId, await seed.person('Ann'));
    const reader = await seed.join(workspaceId, await seed.person('Rob'));
    const { channelId } = await seed.channel(creator, kind, [owner, author, reader]);

    const services = socialServices(txHost);
    const send = (who: WorkspaceMember, markdown: string, extra: Partial<SendMessageDto> = {}) =>
      services.sending.send(who, channelId, { markdown, clientNonce: randomUUID(), ...extra });
    const remove = (who: WorkspaceMember, ...ids: string[]) =>
      services.deleting.delete(who, channelId, ids);
    const announced = () => services.published.map(({ name }) => name);

    return {
      workspaceId,
      channelId,
      owner,
      creator,
      author,
      reader,
      services,
      send,
      remove,
      announced,
    };
  }

  await t.test(
    'a retried send returns the first message, announced and kept for push once',
    async () => {
      const chat = await team();
      const request = { markdown: 'Release is out', clientNonce: randomUUID() };

      const first = await chat.services.sending.send(chat.author, chat.channelId, request);
      const retry = await chat.services.sending.send(chat.author, chat.channelId, request);

      assert.equal(retry.id, first.id);
      assert.deepEqual(chat.announced(), [MESSAGE_CREATED_EVENT]);
      const kept = await db
        .select()
        .from(schema.eventOutbox)
        .where(eq(schema.eventOutbox.name, MESSAGE_CREATED_EVENT));
      assert.equal(
        kept.filter(({ payload }) => (payload as { messageId: string }).messageId === first.id)
          .length,
        1,
      );

      const reuse = { ...request, markdown: 'Something else entirely' };
      await assert.rejects(
        chat.services.sending.send(chat.author, chat.channelId, reuse),
        ConflictException,
      );
    },
  );

  await t.test('a quote must come from the message it replies to', async () => {
    const chat = await team();
    const original = await chat.send(chat.author, 'The deploy window is Friday at noon');

    const reply = await chat.send(chat.reader, 'Noted', {
      replyToMessageId: original.id,
      quoteText: 'Friday  at noon',
    });
    assert.equal(reply.replyToMessageId, original.id);

    await assert.rejects(
      chat.send(chat.reader, 'Noted', { replyToMessageId: original.id, quoteText: 'Monday' }),
      BadRequestException,
    );
  });

  await t.test('only the author edits, and an edit of a stale revision conflicts', async () => {
    const chat = await team();
    const message = await chat.send(chat.author, 'Draft');
    const edit = (who: WorkspaceMember, markdown: string, revision?: number) =>
      chat.services.editing.edit(who, chat.channelId, message.id, {
        markdown,
        ...(revision === undefined ? {} : { revision }),
      });

    await assert.rejects(edit(chat.reader, 'Hijacked'), ForbiddenException);

    const edited = await edit(chat.author, 'Final', message.revision);
    assert.equal(edited.markdown, 'Final');
    assert.equal(edited.revision, message.revision + 1);

    await assert.rejects(edit(chat.author, 'Again', message.revision), ConflictException);
  });

  await t.test(
    'in a private channel members delete only their own messages; its creator and the owner delete anyone’s',
    async () => {
      const chat = await team('private');
      const byAuthor = await chat.send(chat.author, 'Oops');
      const byReader = await chat.send(chat.reader, 'Me too');
      const another = await chat.send(chat.author, 'One more');

      await assert.rejects(chat.remove(chat.reader, byAuthor.id), ForbiddenException);

      assert.deepEqual(await chat.remove(chat.creator, byAuthor.id), {
        deletedMessageIds: [byAuthor.id],
      });
      assert.deepEqual(await chat.remove(chat.owner, byReader.id), {
        deletedMessageIds: [byReader.id],
      });
      assert.deepEqual(await chat.remove(chat.author, another.id), {
        deletedMessageIds: [another.id],
      });
    },
  );

  await t.test('in a DM nobody deletes the other side’s messages', async () => {
    const workspaceId = await seed.workspace();
    const ann = await seed.join(workspaceId, await seed.person('Ann'), 'owner');
    const bob = await seed.join(workspaceId, await seed.person('Bob'));
    const { channelId } = await seed.conversation(ann, bob);
    const { sending, deleting } = socialServices(txHost);

    const message = await sending.send(bob, channelId, {
      markdown: 'Hi',
      clientNonce: randomUUID(),
    });

    await assert.rejects(deleting.delete(ann, channelId, [message.id]), ForbiddenException);
  });

  await t.test('a deleted message takes its pin and mentions with it, announced once', async () => {
    const chat = await team();
    const message = await chat.send(chat.author, `Please review, :member[${chat.reader.id}]`);
    await chat.services.pins.add(chat.owner, chat.channelId, message.id);

    await chat.remove(chat.author, message.id);

    assert.deepEqual(await chat.services.pins.list(chat.owner, chat.channelId), []);
    const mentions = await db
      .select()
      .from(schema.messageMentions)
      .where(eq(schema.messageMentions.messageId, message.id));
    assert.deepEqual(mentions, []);
    assert.equal(chat.announced().filter((name) => name === MESSAGE_DELETED_EVENT).length, 1);

    await chat.remove(chat.author, message.id);
    assert.equal(
      chat.announced().filter((name) => name === MESSAGE_DELETED_EVENT).length,
      1,
      'deleting it again changes nothing and announces nothing',
    );
  });

  await t.test('a forward is posted once per batch, however often it is retried', async () => {
    const chat = await team();
    const { channelId: targetId } = await seed.channel(chat.creator, 'public', [chat.author]);
    const source = await chat.send(chat.author, 'Worth sharing');
    const forward = {
      target: { kind: 'channel' as const, id: targetId },
      sourceChannelId: chat.channelId,
      batchNonce: randomUUID(),
      messageIds: [source.id],
    };

    const first = await chat.services.forwarding.forward(chat.author, forward);
    const retry = await chat.services.forwarding.forward(chat.author, forward);

    assert.deepEqual(
      retry.messages.map(({ id }) => id),
      first.messages.map(({ id }) => id),
    );
    assert.equal(first.messages[0]?.isForwarded, true);
    assert.equal(chat.announced().filter((name) => name === FORWARD_BATCH_CREATED_EVENT).length, 1);

    const other = await chat.send(chat.author, 'Something else');
    await assert.rejects(
      chat.services.forwarding.forward(chat.author, { ...forward, messageIds: [other.id] }),
      ConflictException,
    );
  });

  await t.test('a forward to a person that fails leaves no conversation behind', async () => {
    const chat = await team();
    const source = await chat.send(chat.author, 'Soon gone');
    await chat.remove(chat.author, source.id);

    const forward = chat.services.forwarding.forward(chat.author, {
      target: { kind: 'member', id: chat.reader.id },
      sourceChannelId: chat.channelId,
      batchNonce: randomUUID(),
      messageIds: [source.id],
    });

    await assert.rejects(forward, NotFoundException);
    const pairs = await db
      .select()
      .from(schema.directMessages)
      .where(eq(schema.directMessages.workspaceId, chat.workspaceId));
    assert.deepEqual(pairs, []);
  });
});
