import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ConversationNotificationSettings, NotificationLevel } from '../preferences/types';
import { NotificationPolicyService } from './notification-policy.service';
import type { NotificationDecision } from './types';

const policy = new NotificationPolicyService();

function heard(level: NotificationLevel): ConversationNotificationSettings {
  return {
    kind: 'channel',
    channel: { level, notificationsMuted: false, mutedUntil: null },
    workspace: { level: 'default', notificationsMuted: false, mutedUntil: null },
  };
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
