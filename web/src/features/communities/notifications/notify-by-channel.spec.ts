import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextSnoozeEnd } from './notify-by-channel.ts';
import type { WorkspaceNotifications } from './types.ts';

const now = Date.parse('2026-10-17T12:00:00Z');

function notifications(
  workspaceUntil: string | null,
  conversationsUntil: Array<string | null>,
): WorkspaceNotifications {
  return {
    settings: { level: 'default', isMuted: Boolean(workspaceUntil), mutedUntil: workspaceUntil },
    conversations: conversationsUntil.map((mutedUntil, index) => ({
      channelId: `channel-${index}`,
      notify: mutedUntil ? 'none' : 'mentions',
      mutedUntil,
    })),
  };
}

test('the soonest snooze still ahead is when the workspace changes by itself', () => {
  const soon = '2026-10-17T13:00:00Z';
  const later = '2026-10-18T12:00:00Z';

  assert.equal(nextSnoozeEnd(notifications(later, [null, soon]), now), Date.parse(soon));
  assert.equal(nextSnoozeEnd(notifications(null, ['2026-10-17T11:00:00Z']), now), null);
  assert.equal(nextSnoozeEnd(undefined, now), null);
});
