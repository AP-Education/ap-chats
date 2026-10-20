import assert from 'node:assert/strict';
import { test } from 'node:test';

import { answerAbout, isForAssistant } from './assistant';
import { clientConversations, findClientConversation } from './data';

const marta = findClientConversation('d-F1d')!;
const taras = findClientConversation('d-F1e')!;

test('only a message that starts with the mention goes to the assistant', () => {
  assert.equal(isForAssistant('@StarMe що вона хотіла?'), true);
  assert.equal(isForAssistant('  @starme next'), true);
  assert.equal(isForAssistant('Добрий день, @StarMe'), false);
});

test('what the client wanted comes from their own messages, with their times', () => {
  const answer = answerAbout(marta, 'що вона хотіла?');
  assert.match(answer.text, /грант/);
  assert.deepEqual(answer.sources, ['повідомлення 10:12', 'повідомлення 10:13']);
});

test('the next step carries the deal, its urgency and the open tasks', () => {
  const answer = answerAbout(marta, 'який наступний крок?');
  assert.match(answer.text, /grant question · call/);
  assert.match(answer.text, /SLA 1:40/);
  assert.match(answer.text, /Передзвонити щодо гранту/);
});

test('calls are summarised with what stayed open, or said to be none', () => {
  assert.match(answerAbout(taras, 'що було на дзвінках?').text, /відкрите — рівень англійської/);
  assert.match(answerAbout(marta, 'що було на дзвінках?').text, /ще не було/);
});

test('every client gets an answer to any question', () => {
  for (const conversation of clientConversations) {
    for (const question of ['що далі?', 'когда оплата', 'привіт']) {
      assert.ok(answerAbout(conversation, question).text.length > 0, conversation.id);
    }
  }
});
