import assert from 'node:assert/strict';
import { test } from 'node:test';

import type {
  ConversationNotificationSettings,
  NotificationLevel,
  NotificationSettingsUpdate,
} from '../preferences/types';
import { NotificationPolicyService } from './notification-policy.service';
import type { NotificationDecision } from './types';

const policy = new NotificationPolicyService();

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

function heard(level: NotificationLevel): ConversationNotificationSettings {
  return settings('channel', { level });
}

function decision(changes: Partial<NotificationDecision> = {}): NotificationDecision {
  return {
    kind: 'message.created',
    actorMemberId: 'author',
    recipientMemberId: 'recipient',
    settings: heard('all'),
    mentioned: false,
    ...changes,
  };
}

test('channels speak up for mentions and direct messages for everything, unless told otherwise', () => {
  assert.equal(policy.messageLevel(settings('channel'), now), 'mentions');
  assert.equal(policy.messageLevel(settings('dm'), now), 'all');
});

test('a channel follows its workspace, and its own choice wins over it', () => {
  assert.equal(policy.messageLevel(settings('channel', {}, { level: 'all' }), now), 'all');
  assert.equal(
    policy.messageLevel(settings('channel', { level: 'mentions' }, { level: 'all' }), now),
    'mentions',
  );
  assert.equal(
    policy.messageLevel(settings('channel', { level: 'all' }, { level: 'mentions' }), now),
    'all',
  );
});

test('a muted workspace silences every channel in it, but never a direct message', () => {
  const mutedWorkspace = { notificationsMuted: true };

  assert.equal(
    policy.messageLevel(settings('channel', { level: 'all' }, mutedWorkspace), now),
    'none',
  );
  assert.equal(policy.messageLevel(settings('channel', {}, { level: 'none' }), now), 'none');
  assert.equal(policy.messageLevel(settings('dm', {}, mutedWorkspace), now), 'all');
});

test('a snooze silences until it runs out, when the level it kept comes back', () => {
  const snoozed = settings('channel', { level: 'all', mutedUntil: later });

  assert.equal(policy.messageLevel(snoozed, now), 'none');
  assert.equal(policy.messageLevel(snoozed, evenLater), 'all');
});

test('what is silenced may change once the soonest running snooze ends', () => {
  const snoozedLater = { ...unset, mutedUntil: later };
  const snoozedEvenLater = { ...unset, mutedUntil: evenLater };
  const endedSnooze = { ...unset, mutedUntil: new Date('2026-10-17T11:00:00Z') };

  assert.deepEqual(policy.nextChange([snoozedEvenLater, unset, snoozedLater], now), later);
  assert.equal(policy.nextChange([unset, endedSnooze], now), null);
});

test('a new message alerts whoever hears the conversation at its level', () => {
  assert.equal(policy.shouldAlert(decision()), true);
  assert.equal(policy.shouldAlert(decision({ kind: 'message.forwarded' })), true);
  assert.equal(policy.shouldAlert(decision({ settings: heard('mentions') })), false);
  assert.equal(
    policy.shouldAlert(decision({ settings: heard('mentions'), mentioned: true })),
    true,
  );
});

test('the author, calls, deletions and a silenced conversation never alert', () => {
  assert.equal(policy.shouldAlert(decision({ recipientMemberId: 'author' })), false);
  assert.equal(policy.shouldAlert(decision({ kind: 'call.created' })), false);
  assert.equal(policy.shouldAlert(decision({ kind: 'message.deleted' })), false);
  assert.equal(policy.shouldAlert(decision({ settings: heard('none'), mentioned: true })), false);
});
