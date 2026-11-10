import assert from 'node:assert/strict';
import { test } from 'node:test';

import { answersOnTheirWay } from './answers.ts';
import type { OpenQuestion } from './questions.ts';
import type { AnswerFailure } from './types';

const starMe = { memberId: 'star-me', displayName: 'StarMe', avatarPath: null, isBot: true };

function question(
  questionId: string,
  state: 'thinking' | 'answered' | 'failed',
  askedBy = 'vlad',
  failure: AnswerFailure = 'limited',
): OpenQuestion {
  const ref = {
    workspaceId: 'w',
    channelId: 'c',
    questionId,
    askedByMemberId: askedBy,
    answerNonce: `answer-${questionId}`,
    shownSince: '2026-11-02T10:00:00.000Z',
  };
  return state === 'failed' ? { ...ref, state, failure } : { ...ref, state, failure: null };
}

const shown = (questions: OpenQuestion[], viewer = 'vlad') =>
  answersOnTheirWay(questions, starMe, viewer).map(({ nonce, status, entry }) => ({
    nonce,
    status,
    question: entry.payload.questionId,
  }));

test("StarMe's answer is on its way in StarMe's run, under the nonce the answer will carry", () => {
  const [answer] = answersOnTheirWay([question('q1', 'thinking', 'ilya')], starMe, 'vlad');

  assert.equal(answer?.status, 'sending');
  assert.equal(answer?.nonce, 'answer-q1');
  assert.equal(answer?.entry.nonce, 'answer-q1');
  assert.equal(answer?.entry.author, 'star-me');
  assert.deepEqual(answer?.entry.payload.author, starMe);
});

test('an answered question stays on its way until the history takes it', () => {
  assert.deepEqual(shown([question('q1', 'answered')]), [
    { nonce: 'answer-q1', status: 'sending', question: 'q1' },
  ]);
});

test('only the asker sees why StarMe could not answer, and not while it answers anything', () => {
  const failures = [question('q1', 'failed'), question('q2', 'failed', 'ilya')];

  assert.deepEqual(shown(failures), [{ nonce: 'answer-q1', status: 'failed', question: 'q1' }]);
  assert.deepEqual(shown(failures, 'olha'), []);
  assert.deepEqual(shown([...failures, question('q3', 'thinking', 'olha')]), [
    { nonce: 'answer-q3', status: 'sending', question: 'q3' },
  ]);
});
