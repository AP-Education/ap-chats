import assert from 'node:assert/strict';
import { test } from 'node:test';

import { answerAbout, assistantTurns, isForAssistant, questionOf } from './assistant';
import { clientConversations, findClientConversation } from './data';

const marta = findClientConversation('d-F1d')!;
const taras = findClientConversation('d-F1e')!;

test('only a message that starts with the mention goes to the assistant', () => {
  assert.equal(isForAssistant('@StarMe what did she want?'), true);
  assert.equal(isForAssistant('  @starme next'), true);
  assert.equal(isForAssistant('Hello, @StarMe'), false);
  assert.equal(isForAssistant('@Stram me what task i have'), true);
  assert.equal(isForAssistant('@Star me next'), true);
  assert.equal(isForAssistant('@Steve can you call'), false);
  assert.equal(questionOf('@StarMe  next step?'), 'next step?');
  assert.equal(questionOf('@Stram me what task i have'), 'what task i have');
});

test('StarMe reads the client card, the conversation and then the question', () => {
  const turns = assistantTurns(marta, marta.messages, "what's the next step?", 'Oksana');
  assert.equal(turns[0]?.author, 'CRM');
  assert.match(turns[0]?.text ?? '', /International MBA/);
  assert.match(turns[0]?.text ?? '', /SLA 1:40/);
  assert.equal(turns[1]?.author, 'Marta Levchenko');
  assert.deepEqual(turns.at(-1), {
    role: 'user',
    author: 'Oksana',
    text: "@StarMe what's the next step?",
  });
});

test("the assistant's earlier answers go back to it as its own turns", () => {
  const turns = assistantTurns(
    marta,
    [...marta.messages, { id: 'a', direction: 'assistant', text: 'Call her today.', at: 'now' }],
    'and then?',
    'Oksana',
  );
  assert.deepEqual(turns.at(-2), { role: 'assistant', text: 'Call her today.' });
});

test('offline, what the client wanted comes from their own messages, with their times', () => {
  const answer = answerAbout(marta, 'what did the client want?');
  assert.match(answer.text, /grant/);
  assert.deepEqual(answer.sources, ['message 10:12', 'message 10:13']);
});

test('offline, the next step carries the deal, its urgency and the open tasks', () => {
  const answer = answerAbout(marta, "what's the next step?");
  assert.match(answer.text, /grant question · call/);
  assert.match(answer.text, /SLA 1:40/);
  assert.match(answer.text, /Call back about the grant/);
});

test('offline, calls are summarised with what stayed open, or said to be none', () => {
  assert.match(answerAbout(taras, 'what happened on the calls?').text, /still open: English level/);
  assert.match(answerAbout(marta, 'what happened on the calls?').text, /no calls/);
});

test('every client gets an answer to any question', () => {
  for (const conversation of clientConversations) {
    for (const question of ['what next?', 'payment', 'hello']) {
      assert.ok(answerAbout(conversation, question).text.length > 0, conversation.id);
    }
  }
});
