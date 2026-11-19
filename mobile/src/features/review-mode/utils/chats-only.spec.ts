import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { TabBarModel } from '../../navigation/types';
import {
  chatsHomeUrl,
  chatsOnlyTabs,
  hideAccountBlockScript,
  isChatsOnlyAccount,
  isChatsPage,
  parseAccountIds,
  tokenSubject,
} from './chats-only';

const APP = 'https://app.example.com';

function token(claims: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256' })}.${encode(claims)}.signature`;
}

test('parses the reviewer ids, ignoring blanks and spaces', () => {
  assert.deepEqual([...parseAccountIds(' a , ,b ')], ['a', 'b']);
  assert.equal(parseAccountIds(undefined).size, 0);
});

test('reads the subject of an access token', () => {
  assert.equal(tokenSubject(token({ sub: 'user-1', appId: 'app' })), 'user-1');
  assert.equal(tokenSubject(token({ sub: 'réviewer-ї' })), 'réviewer-ї');
  assert.equal(tokenSubject('not-a-token'), null);
  assert.equal(tokenSubject('a.%%%.c'), null);
  assert.equal(tokenSubject(token({ appId: 'app' })), null);
});

test('limits only the listed accounts', () => {
  const ids = parseAccountIds('reviewer-apple,reviewer-google');
  assert.equal(isChatsOnlyAccount(token({ sub: 'reviewer-google' }), ids), true);
  assert.equal(isChatsOnlyAccount(token({ sub: 'employee' }), ids), false);
  assert.equal(isChatsOnlyAccount(undefined, ids), false);
  assert.equal(isChatsOnlyAccount(token({ sub: 'reviewer-apple' }), new Set()), false);
});

test('keeps Chats and the profile, nothing else of the shell', () => {
  assert.equal(isChatsPage(`${APP}/c`, APP), true);
  assert.equal(isChatsPage(`${APP}/c/w/1/channels/2?x=1`, APP), true);
  assert.equal(isChatsPage(`${APP}/profile?settings.chats=x`, APP), true);
  assert.equal(isChatsPage(`${APP}/`, APP), false);
  assert.equal(isChatsPage(`${APP}/account`, APP), false);
  assert.equal(isChatsPage(`${APP}/lms/courses`, APP), false);
  assert.equal(isChatsPage(`${APP}/chat`, APP), false);
});

test('leaves pages of other origins to the sign-in and link handling', () => {
  assert.equal(isChatsPage('https://accounts.example.com/login', APP), true);
  assert.equal(isChatsPage('about:blank', APP), true);
});

test('points home at Chats', () => {
  assert.equal(chatsHomeUrl(`${APP}/`), `${APP}/c`);
});

test('drops the other applications from the tab bar', () => {
  const tab = (id: string) => ({
    id,
    label: id,
    symbol: { ios: 'circle', android: 'circle' } as never,
    badge: 0,
  });
  const model: TabBarModel = {
    items: [tab('chats:home'), tab('ai:home'), tab('lms:courses'), tab('profile')],
    activeId: 'ai:home',
    visible: true,
  };
  const limited = chatsOnlyTabs(model);
  assert.deepEqual(
    limited.items.map(({ id }) => id),
    ['chats:home', 'profile'],
  );
  assert.equal(limited.activeId, 'chats:home');
  assert.equal(chatsOnlyTabs({ ...model, activeId: 'profile' }).activeId, 'profile');
});

test('adds the account-block rule once per document', async () => {
  const { runInNewContext } = await import('node:vm');
  const added: { id: string; textContent: string }[] = [];
  const document = {
    head: { appendChild: (node: { id: string; textContent: string }) => added.push(node) },
    documentElement: null,
    getElementById: (id: string) => added.find((node) => node.id === id) ?? null,
    createElement: () => ({ id: '', textContent: '' }),
  };
  runInNewContext(hideAccountBlockScript(), { document });
  runInNewContext(hideAccountBlockScript(), { document });
  assert.equal(added.length, 1);
  assert.match(added[0].textContent, /section\[aria-labelledby="profile-appearance"\]/);
  assert.match(added[0].textContent, /display:none!important/);
});
