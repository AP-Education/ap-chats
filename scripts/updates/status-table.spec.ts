import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { UpdateSummary } from './admin-api';
import { statusTable } from './status-table';

const update: UpdateSummary = {
  id: '6f1c2b1e-0000-4000-8000-000000000001',
  kind: 'update',
  platform: 'ios',
  channel: 'production',
  runtimeVersion: 'r1',
  buildNumber: 12,
  rolloutPercent: 10,
  status: 'active',
  mandatory: false,
  sourceUpdateId: null,
  gitCommit: 'abcdef0123456789',
  notes: 'Fix | the tab bar',
  createdBy: 'ci',
  createdAt: '2026-11-17T10:20:30.000Z',
  launches: 200,
  successes: 199,
  emergencyLaunches: 0,
};

test('shows rollout, launch success and emergencies per update', () => {
  const lines = statusTable([update]).split('\n');
  assert.equal(lines.length, 3);
  assert.equal(
    lines[2],
    '| `6f1c2b1e-0000-4000-8000-000000000001` | ios | 12 | active | 10% | 200 | 99.5% | 0 | 2026-11-17 10:20 | `abcdef0` | Fix \\| the tab bar |',
  );
});

test('names rollbacks and leaves success blank before any launch', () => {
  const rows = statusTable([
    { ...update, kind: 'rollback_to_embedded', launches: 0, successes: 0 },
    { ...update, sourceUpdateId: '1234567890ab', mandatory: true, rolloutPercent: 100 },
  ]).split('\n');
  assert.match(rows[2] ?? '', /\| — \|.*back to the store bundle/u);
  assert.match(rows[3] ?? '', /100% mandatory.*republish of `12345678`/u);
});

test('says so when the channel has nothing', () => {
  assert.equal(statusTable([]), '_No updates on this channel yet._');
});
