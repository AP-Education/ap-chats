import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { BadRequestException, HttpException } from '@nestjs/common';

import type { MemberSummary, WorkspaceMember } from '@/components/workspaces/members/types';

import { Assistant, AssistantFailure, type AssistantTurn } from './assistant';
import type { StarMeStatusEvent } from './events/star-me-status.event';
import { StarMeRepository } from './repository';
import { STAR_ME } from './star-me.identity';
import { answerNonce, StarMeService } from './star-me.service';
import type { ConversationMessage, Question } from './types';

const ids = {
  workspace: '0b9d6f5e-4c3a-4b2d-8e1f-7a6b5c4d3e21',
  channel: '1c8e7d6f-5b4a-4c3d-9e2f-8b7a6c5d4e32',
  question: '2d7f8e9a-6c5b-4d4e-af3a-9c8b7d6e5f43',
  picked: '3e6a9f8b-7d6c-4e5f-b04b-ad9c8e7f6a54',
  ilya: '4f5b8a9c-8e7d-4f6a-81c5-be8d9f8a7b65',
  vlad: '5a4c7b8d-9f8e-4a7b-92d6-cf9eaf9b8c76',
  starMe: '6b3d6c7e-af9f-4b8c-a3e7-d0afb0ac9d87',
};

const starMe = member(ids.starMe, STAR_ME.subject, 'StarMe', true);
const vlad = member(ids.vlad, 'vlad-oidc', 'Влад');

class FakeRepository extends StarMeRepository {
  question$: Question | undefined;
  answered: string | undefined;
  recentMessages: ConversationMessage[] = [];
  selectedMessages: ConversationMessage[] = [];
  pickedIds: string[] = [];
  read: string[] = [];

  async saveIdentity() {}
  async enrol() {}
  async question() {
    return this.question$;
  }
  async answerId() {
    return this.answered;
  }
  async recent() {
    this.read.push('recent');
    return this.recentMessages;
  }
  async selected(_channelId: string, messageIds: string[]) {
    this.read.push(`selected:${messageIds.join(',')}`);
    return this.selectedMessages.filter((message) => messageIds.includes(message.id));
  }
  async pick(_question: Question, messageIds: string[]) {
    this.pickedIds.push(...messageIds);
  }
  async picked() {
    return this.selectedMessages.filter((message) => this.pickedIds.includes(message.id));
  }
}

class FakeAssistant extends Assistant {
  turns: AssistantTurn[] = [];
  failure: AssistantFailure | undefined;

  async reply(turns: AssistantTurn[]) {
    this.turns = turns;
    if (this.failure) throw this.failure;
    return 'Підсумок: Влад дивиться PR до пʼятниці.';
  }
}

interface Sent {
  channelId: string;
  markdown: string;
  clientNonce: string;
  replyToMessageId?: string;
}

let repository: FakeRepository;
let assistant: FakeAssistant;
let statuses: StarMeStatusEvent[];
let joined: string[];
let answers: Sent[];
let starMeService: StarMeService;

beforeEach(() => {
  repository = new FakeRepository();
  assistant = new FakeAssistant();
  statuses = [];
  joined = [];
  answers = [];
  starMeService = new StarMeService(
    {
      findForUser: async (_: string, subject: string) =>
        subject === STAR_ME.subject ? starMe : undefined,
    } as never,
    { requireViewAccess: async () => ({}) } as never,
    {
      add: async (_asker: WorkspaceMember, channelId: string, memberId: string) =>
        joined.push(`${channelId}:${memberId}`),
    } as never,
    {
      send: async (_author: WorkspaceMember, channelId: string, dto: Omit<Sent, 'channelId'>) => {
        answers.push({ ...dto, channelId });
        return { id: 'answer-1' };
      },
    } as never,
    repository,
    assistant,
    {
      publish: (_key: string, event: unknown) => {
        statuses.push(event as StarMeStatusEvent);
      },
    },
  );
});

function ask(contextMessageIds?: string[]) {
  const dto = contextMessageIds
    ? { questionId: ids.question, contextMessageIds }
    : { questionId: ids.question };
  return starMeService.answer(vlad, ids.channel, dto, 'token');
}

test('a mention is answered in its channel from the latest messages', async () => {
  repository.question$ = question({ mentionsStarMe: true });
  repository.recentMessages = [
    message(ids.picked, 1n, person(ids.ilya, 'Ілля'), 'Влад, глянь PR до пʼятниці'),
    message(ids.question, 2n, person(ids.vlad, 'Влад'), `:member[${ids.starMe}] підсумуй`, [
      person(ids.starMe, 'StarMe'),
    ]),
  ];

  const result = await ask();

  assert.deepEqual(result, { answerId: 'answer-1' });
  assert.deepEqual(
    assistant.turns.map(({ role, author, text }) => ({ role, author, text })),
    [
      { role: 'user', author: 'Ілля', text: 'Влад, глянь PR до пʼятниці' },
      { role: 'user', author: 'Влад', text: '@StarMe підсумуй' },
    ],
  );
  assert.deepEqual(joined, [`${ids.channel}:${ids.starMe}`]);
  assert.equal(answers[0]?.replyToMessageId, ids.question);
  assert.equal(answers[0]?.clientNonce, answerNonce(ids.question));
  assert.deepEqual(
    statuses.map(({ state }) => state),
    ['thinking', 'answered'],
  );
});

test('StarMe reads its own earlier answers as its own turns', async () => {
  repository.question$ = question({ mentionsStarMe: true });
  repository.recentMessages = [
    message(ids.picked, 1n, person(ids.starMe, 'StarMe', true), 'Поставив задачу на Влада'),
    message(ids.question, 2n, person(ids.vlad, 'Влад'), 'а тепер на Іллю'),
  ];

  await ask();

  assert.deepEqual(
    assistant.turns.map(({ role }) => role),
    ['assistant', 'user'],
  );
});

test('picked messages are read instead of the latest ones', async () => {
  repository.question$ = question({ mentionsStarMe: true });
  repository.selectedMessages = [
    message(ids.picked, 1n, person(ids.ilya, 'Ілля'), 'Бюджет на квартал'),
    message(ids.question, 2n, person(ids.vlad, 'Влад'), 'що тут головне?'),
  ];

  await ask([ids.picked]);

  assert.deepEqual(repository.pickedIds, [ids.picked]);
  assert.deepEqual(repository.read, [`selected:${ids.question}`]);
  assert.deepEqual(
    assistant.turns.map(({ text }) => text),
    ['Бюджет на квартал', 'що тут головне?'],
  );
});

test('a reply to StarMe follows up without mentioning it', async () => {
  repository.question$ = question({ repliesToStarMe: true });
  repository.recentMessages = [
    message(ids.question, 2n, person(ids.vlad, 'Влад'), 'а детальніше?'),
  ];

  await ask();

  assert.equal(answers.length, 1);
});

test('a message that does not ask StarMe gets no answer', async () => {
  repository.question$ = question({});

  await assert.rejects(ask(), BadRequestException);
  assert.deepEqual(assistant.turns, []);
  assert.deepEqual(statuses, []);
});

test('asking again after an answer returns it without running again', async () => {
  repository.question$ = question({ mentionsStarMe: true });
  repository.answered = 'answer-0';

  const result = await ask();

  assert.deepEqual(result, { answerId: 'answer-0' });
  assert.deepEqual(assistant.turns, []);
});

test('a refused run tells the channel and the asker why', async () => {
  repository.question$ = question({ mentionsStarMe: true });
  repository.recentMessages = [message(ids.question, 1n, person(ids.vlad, 'Влад'), 'підсумуй')];
  assistant.failure = new AssistantFailure('limited');

  await assert.rejects(
    ask(),
    (error: unknown) => error instanceof HttpException && error.getStatus() === 429,
  );
  assert.deepEqual(
    statuses.map(({ state, failure, askedByMemberId }) => ({ state, failure, askedByMemberId })),
    [
      { state: 'thinking', failure: null, askedByMemberId: ids.vlad },
      { state: 'failed', failure: 'limited', askedByMemberId: ids.vlad },
    ],
  );
  assert.deepEqual(answers, []);
});

function question(how: Partial<Pick<Question, 'mentionsStarMe' | 'repliesToStarMe'>>): Question {
  return {
    id: ids.question,
    workspaceId: ids.workspace,
    channelId: ids.channel,
    seq: 2n,
    mentionsStarMe: false,
    repliesToStarMe: false,
    ...how,
  };
}

function message(
  id: string,
  seq: bigint,
  author: MemberSummary,
  markdown: string,
  mentions: MemberSummary[] = [],
): ConversationMessage {
  return { id, seq, author, markdown, mentions, createdAt: new Date('2026-10-10T09:00:00Z') };
}

function person(memberId: string, displayName: string, isBot = false): MemberSummary {
  return { memberId, displayName, avatarPath: null, isBot };
}

function member(id: string, subject: string, displayName: string, isBot = false): WorkspaceMember {
  return {
    id,
    workspaceId: ids.workspace,
    userProfileId: `profile-${id}`,
    profile: { id: `profile-${id}`, oidcUserId: subject, displayName, avatarPath: null, isBot },
    role: 'member',
    status: 'active',
    leftAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
