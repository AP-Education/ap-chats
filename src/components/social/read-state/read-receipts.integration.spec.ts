import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seedConversations } from '@/testing/conversations';
import { migratedDatabase, transactionHost } from '@/testing/pglite';
import { socialServices } from '@/testing/social';

import { READ_RECEIPT_EVENT, ReadReceiptEvent } from './events/read-receipt.event';

test('read receipts on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const txHost = transactionHost(db);
  const seed = seedConversations(db);

  /** Ann and Rob in one workspace, with services that collect the receipts they announce. */
  async function people() {
    const workspaceId = await seed.workspace();
    const ann = await seed.join(workspaceId, await seed.person('Ann'));
    const rob = await seed.join(workspaceId, await seed.person('Rob'));
    const services = socialServices(txHost);
    const receipts = () =>
      services.published
        .filter(({ name }) => name === READ_RECEIPT_EVENT)
        .map(({ event }) => event);

    return { ann, rob, services, receipts };
  }

  await t.test('each side of a direct conversation sees how far the other has read', async () => {
    const { ann, rob, services, receipts } = await people();
    const chat = await seed.conversation(ann, rob);
    await seed.post(chat, ann);
    await seed.post(chat, ann);

    const unread = await services.history.window(ann, chat.channelId, {});
    assert.equal(unread.peerReadSeq, '0');

    await services.readState.markRead(rob, chat.channelId, '2');

    const read = await services.history.window(ann, chat.channelId, {});
    assert.equal(read.peerReadSeq, '2');
    const robsSide = await services.history.window(rob, chat.channelId, {});
    assert.equal(robsSide.peerReadSeq, '0', 'reading is not being read');
    assert.deepEqual(receipts(), [
      new ReadReceiptEvent(chat.workspaceId, chat.channelId, rob.id, '2'),
    ]);
  });

  await t.test('going back to an older message sends no receipt', async () => {
    const { ann, rob, services, receipts } = await people();
    const chat = await seed.conversation(ann, rob);
    await seed.post(chat, ann);
    await seed.post(chat, ann);

    await services.readState.markRead(rob, chat.channelId, '2');
    await services.readState.markRead(rob, chat.channelId, '1');

    assert.equal(receipts().length, 1);
  });

  await t.test('a channel keeps how far its members have read to itself', async () => {
    const { ann, rob, services, receipts } = await people();
    const channel = await seed.channel(ann, 'public', [rob]);
    await seed.post(channel, ann);

    await services.readState.markRead(rob, channel.channelId, '1');

    const page = await services.history.window(ann, channel.channelId, {});
    assert.equal(page.peerReadSeq, null);
    assert.deepEqual(receipts(), []);
  });
});
