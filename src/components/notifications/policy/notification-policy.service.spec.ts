import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { StoredNotificationSettings } from '../preferences/types';
import { NotificationPolicyService } from './notification-policy.service';
import type { NotificationDecision } from './types';

const policy = new NotificationPolicyService();
const settings: StoredNotificationSettings = {
  memberId: 'recipient',
  level: 'default',
  notificationsMuted: false,
  mutedUntil: null,
};

function decision(changes: Partial<NotificationDecision> = {}): NotificationDecision {
  return {
    kind: 'message.created',
    actorMemberId: 'author',
    recipientMemberId: 'recipient',
    channelKind: 'public',
    settings,
    mentioned: false,
    ...changes,
  };
}

test('channel default alerts on structured mentions while DM default alerts on messages', () => {
  assert.equal(policy.shouldAlert(decision()), false);
  assert.equal(policy.shouldAlert(decision({ mentioned: true })), true);
  assert.equal(policy.shouldAlert(decision({ channelKind: 'dm' })), true);
});

test('mute, author and non-message changes never alert', () => {
  assert.equal(
    policy.shouldAlert(decision({ recipientMemberId: 'author', mentioned: true })),
    false,
  );
  assert.equal(policy.shouldAlert(decision({ kind: 'call.created', mentioned: true })), false);
  assert.equal(
    policy.shouldAlert(
      decision({ settings: { ...settings, notificationsMuted: true }, mentioned: true }),
    ),
    false,
  );
  assert.equal(
    policy.shouldAlert(decision({ settings: { ...settings, level: 'none' }, mentioned: true })),
    false,
  );
});

test('all and mentions overrides use the recipient preference', () => {
  assert.equal(policy.shouldAlert(decision({ settings: { ...settings, level: 'all' } })), true);
  assert.equal(
    policy.shouldAlert(
      decision({ channelKind: 'dm', settings: { ...settings, level: 'mentions' } }),
    ),
    false,
  );
  assert.equal(
    policy.shouldAlert(
      decision({
        channelKind: 'dm',
        settings: { ...settings, level: 'mentions' },
        mentioned: true,
      }),
    ),
    true,
  );
});
