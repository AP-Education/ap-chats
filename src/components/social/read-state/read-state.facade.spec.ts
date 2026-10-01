import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { EventPublisher } from '@/globals/publisher/event-publisher';

import { ReadStateFacade } from './read-state.facade';
import type { ReadStateRepository } from './repository/read-state.repository';

test('history cursor reads one indexed membership row without counting unread entries', async () => {
  let cursorReads = 0;
  const repository = {
    async workspaceSummary() {
      throw new Error('Unexpected workspace lookup');
    },
    async lastReadSeq() {
      cursorReads++;
      return 42n;
    },
    async unreadCount() {
      throw new Error('History must not count unread entries');
    },
    async entryExists() {
      throw new Error('Unexpected entry lookup');
    },
    async advance() {
      throw new Error('Unexpected cursor update');
    },
  } as ReadStateRepository;
  const facade = new ReadStateFacade({} as ChannelAccessFacade, repository, {} as EventPublisher);

  assert.deepEqual(await facade.cursor('channel', 'member'), { lastReadEntrySeq: '42' });
  assert.equal(cursorReads, 1);
});
