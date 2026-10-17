import assert from 'node:assert/strict';
import { test } from 'node:test';

import { conversationNotify, snoozedUntil } from './notification-settings.rules';
import type { ConversationNotificationSettings, NotificationSettingsUpdate } from './types';

const now = new Date('2026-10-17T12:00:00Z');
const later = new Date('2026-10-17T13:00:00Z');
const evenLater = new Date('2026-10-18T12:00:00Z');

const unset: NotificationSettingsUpdate = {
  level: 'default',
  notificationsMuted: false,
  mutedUntil: null,
};

function settings(
  kind: ConversationNotificationSettings['kind'],
  channel: Partial<NotificationSettingsUpdate> = {},
  workspace: Partial<NotificationSettingsUpdate> = {},
): ConversationNotificationSettings {
  return { kind, channel: { ...unset, ...channel }, workspace: { ...unset, ...workspace } };
}

test('channels speak up for mentions and direct messages for everything, unless told otherwise', () => {
  assert.equal(conversationNotify(settings('channel'), now), 'mentions');
  assert.equal(conversationNotify(settings('dm'), now), 'all');
});

test('a channel follows its workspace, and its own choice wins over it', () => {
  assert.equal(conversationNotify(settings('channel', {}, { level: 'all' }), now), 'all');
  assert.equal(
    conversationNotify(settings('channel', { level: 'mentions' }, { level: 'all' }), now),
    'mentions',
  );
  assert.equal(
    conversationNotify(settings('channel', { level: 'all' }, { level: 'mentions' }), now),
    'all',
  );
});

test('a muted workspace silences every channel in it, but never a direct message', () => {
  const mutedWorkspace = { notificationsMuted: true };

  assert.equal(
    conversationNotify(settings('channel', { level: 'all' }, mutedWorkspace), now),
    'none',
  );
  assert.equal(conversationNotify(settings('channel', {}, { level: 'none' }), now), 'none');
  assert.equal(conversationNotify(settings('dm', {}, mutedWorkspace), now), 'all');
});

test('a snooze silences until it runs out, when the level it kept comes back', () => {
  const snoozed = settings('channel', { level: 'all', mutedUntil: later });

  assert.equal(conversationNotify(snoozed, now), 'none');
  assert.equal(conversationNotify(snoozed, evenLater), 'all');
});

test('a quiet conversation speaks again once its last snooze runs out, never if muted for good', () => {
  assert.equal(snoozedUntil(settings('channel'), now), null);
  assert.deepEqual(
    snoozedUntil(settings('channel', { mutedUntil: later }, { mutedUntil: evenLater }), now),
    evenLater,
  );
  assert.equal(
    snoozedUntil(settings('channel', { mutedUntil: later }, { notificationsMuted: true }), now),
    null,
  );
  assert.equal(snoozedUntil(settings('dm', {}, { mutedUntil: later }), now), null);
});
