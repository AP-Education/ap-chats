import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SentMessage } from '@/features/social/conversation-scope/extensions';

import {
  asksStarMe,
  lastFailure,
  type OpenQuestion,
  withoutLanded,
  withSnapshot,
  withStatus,
} from './questions.ts';
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
    answerNonce: `answer-${questionId}`,
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
    answerNonce: `answer-${questionId}`,
    state: 'failed',
    failure: 'limited',
  };
}

test('a message asks StarMe by mentioning it or replying to it', () => {
  assert.equal(asksStarMe(sent(`:member[${starMe}] підсумуй`), starMe), true);
  assert.equal(asksStarMe(sent('а детальніше?', { replyToAuthorId: starMe }), starMe), true);
  assert.equal(asksStarMe(sent('просто повідомлення'), starMe), false);
});

test('an explicit private continuation invokes StarMe before workspace members finish loading', () => {
  assert.equal(
    asksStarMe(sent('Продовження', { input: { markdown: 'Продовження', assistant: true } })),
    true,
  );
  assert.equal(asksStarMe(sent('Звичайне повідомлення')), false);
  assert.equal(asksStarMe(sent('@StarMe текст без справжньої згадки')), false);
});

function shown(question: QuestionStatus, since: string): OpenQuestion {
  return { ...question, shownSince: since };
}

test('a reported status replaces the question it is about, which keeps the time it first showed', () => {
  const open = [shown(status('q1', 'thinking'), '10:00'), shown(status('q2', 'thinking'), '10:01')];

  assert.deepEqual(withStatus(open, failed('q1'), '10:05'), [
    shown(status('q2', 'thinking'), '10:01'),
    shown(failed('q1'), '10:00'),
  ]);
  assert.deepEqual(withStatus([], status('q3', 'thinking'), '10:05'), [
    shown(status('q3', 'thinking'), '10:05'),
  ]);
});

test('an answered question stays until the history holds its answer', () => {
  const open = [shown(status('q1', 'thinking'), '10:00'), shown(status('q2', 'thinking'), '10:01')];
  const answered = withStatus(open, status('q2', 'answered'), '10:02');

  assert.deepEqual(answered, [
    shown(status('q1', 'thinking'), '10:00'),
    shown(status('q2', 'answered'), '10:01'),
  ]);
  assert.equal(withoutLanded(answered, new Set(['answer-q1'])), answered);
  assert.deepEqual(withoutLanded(answered, new Set(['answer-q2'])), [
    shown(status('q1', 'thinking'), '10:00'),
  ]);
});

test('a snapshot keeps only what StarMe still reports, each at the time it first showed', () => {
  const open = [shown(status('q1', 'thinking'), '10:00'), shown(status('q2', 'answered'), '10:01')];

  assert.deepEqual(withSnapshot(open, [failed('q1'), status('q3', 'thinking')], '10:09'), [
    shown(failed('q1'), '10:00'),
    shown(status('q3', 'thinking'), '10:09'),
  ]);
});

test('only the asker sees their own latest failure', () => {
  const statuses = [failed('q1'), failed('q2', 'ilya'), status('q3', 'thinking'), failed('q4')];

  assert.equal(lastFailure(statuses, 'vlad')?.questionId, 'q4');
  assert.equal(lastFailure(statuses, 'ilya')?.questionId, 'q2');
  assert.equal(lastFailure(statuses, 'olha'), undefined);
});
