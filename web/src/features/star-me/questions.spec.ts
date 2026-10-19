import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SentMessage } from '@/features/social/conversation-scope/extensions';

import { asksStarMe, lastFailure, withStatus } from './questions.ts';
import type { QuestionStatus } from './types';

const starMe = 'b0b0b0b0-0000-4000-8000-000000000001';

function sent(markdown: string, extra: Partial<SentMessage> = {}): SentMessage {
  return {
    channelId: 'channel',
    input: { markdown },
    landed: new Promise(() => {}),
    ...extra,
  };
}

function status(
  questionId: string,
  state: 'thinking' | 'answered',
  askedBy = 'vlad',
): QuestionStatus {
  return {
    workspaceId: 'w',
    channelId: 'c',
    questionId,
    askedByMemberId: askedBy,
    state,
    failure: null,
  };
}

function failed(questionId: string, askedBy = 'vlad'): QuestionStatus {
  return {
    workspaceId: 'w',
    channelId: 'c',
    questionId,
    askedByMemberId: askedBy,
    state: 'failed',
    failure: 'limited',
  };
}

test('a message asks StarMe by mentioning it or replying to it', () => {
  assert.equal(asksStarMe(sent(`:member[${starMe}] підсумуй`), starMe), true);
  assert.equal(asksStarMe(sent('а детальніше?', { replyToAuthorId: starMe }), starMe), true);
  assert.equal(asksStarMe(sent('просто повідомлення'), starMe), false);
});

test('a reported status replaces the question it is about, and an answer closes it', () => {
  const open = [status('q1', 'thinking'), status('q2', 'thinking')];

  assert.deepEqual(withStatus(open, failed('q1')), [status('q2', 'thinking'), failed('q1')]);
  assert.deepEqual(withStatus(open, status('q2', 'answered')), [status('q1', 'thinking')]);
});

test('only the asker sees their own latest failure', () => {
  const statuses = [failed('q1'), failed('q2', 'ilya'), status('q3', 'thinking'), failed('q4')];

  assert.equal(lastFailure(statuses, 'vlad')?.questionId, 'q4');
  assert.equal(lastFailure(statuses, 'ilya')?.questionId, 'q2');
  assert.equal(lastFailure(statuses, 'olha'), undefined);
});
