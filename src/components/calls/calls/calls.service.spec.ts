import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { ConflictException } from '@nestjs/common';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import { ChannelAccessRepository } from '@/components/communities/channel-access/repository/channel-access.repository';
import type { ChannelAccessSnapshot } from '@/components/communities/channels/types/channel-access.types';
import { EntriesFacade } from '@/components/social/entries';
import { EntriesRepository } from '@/components/social/entries/repository/entries.repository';
import type { ChannelEntry } from '@/components/social/entries/types/entry.types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher';
import { memoryTransactionHost } from '@/testing/transactions';

import { CallLifecycle } from './call-lifecycle';
import { CallPlacement } from './call-placement';
import { CallSignals } from './call-signals';
import { CallsService } from './calls.service';
import {
  CALL_SIGNAL_EVENT,
  type CallSignalEvent,
  type CallSignalKind,
} from './events/call-signal.event';
import { CallProvider } from './provider/call.provider';
import { CallsRepository } from './repository/calls.repository';
import type { CallRecord, CallStatus } from './types';

/**
 * Unit tests for the call use cases: the state-transition rules (who may activate/decline/end a
 * call, and when) and, just as important, *who gets told about it*. Every real bug here (the
 * caller never hearing their own call end, a missed ring excluding whoever's own poll expired it,
 * a self-join silently answering your own call, a group decline killing the call for everyone)
 * was a wrong-recipient bug, invisible to a test that only checks the repository was called.
 *
 * `RecordingEventPublisher` keeps every call signal, so a test can assert exactly which userIds
 * heard which kind. That each signal then reaches those users' sockets is CallEventsRelay's one
 * line, and personal-room delivery is covered by bootstrap.spec.ts.
 */

const ACTIVE_STATUSES: ReadonlySet<CallStatus> = new Set(['ringing', 'active']);

class RecordingEventPublisher extends EventPublisher {
  private readonly signals: CallSignalEvent[] = [];

  publish<T extends object>(name: string, event: T): void {
    if (name === CALL_SIGNAL_EVENT) this.signals.push(event as unknown as CallSignalEvent);
  }

  async record<T extends object>(name: string, event: T) {
    return () => this.publish(name, event);
  }

  /** userIds that heard `kind`, in delivery order. */
  recipientsOf(kind: CallSignalKind): string[] {
    return this.signals
      .filter((signal) => signal.kind === kind)
      .flatMap((signal) => signal.recipientUserIds);
  }
}

class FakeChannelAccessRepository extends ChannelAccessRepository {
  constructor(
    private readonly channels: Map<string, ChannelAccessSnapshot>,
    private readonly membership: Map<string, Set<string>>,
  ) {
    super();
  }

  async lockChannel(_workspaceId: string, channelId: string) {
    return this.channels.get(channelId);
  }

  async findChannel(_workspaceId: string, channelId: string) {
    return this.channels.get(channelId);
  }

  async isActiveWorkspaceMember() {
    return true;
  }

  async isChannelMember(channelId: string, memberId: string) {
    return this.membership.get(channelId)?.has(memberId) ?? false;
  }

  async isDmPeerActive() {
    return true;
  }
}

class FakeEntriesRepository extends EntriesRepository {
  async append(): Promise<never> {
    throw new Error('not exercised by these tests');
  }

  async appendMany(): Promise<never> {
    throw new Error('not exercised by these tests');
  }

  async appendCall(workspaceId: string, channelId: string, callId: string): Promise<ChannelEntry> {
    return {
      id: 'entry-1',
      workspaceId,
      channelId,
      seq: 1n,
      messageId: null,
      callId,
      createdAt: new Date(),
    };
  }
}

class FakeCallProvider extends CallProvider {
  readonly isConfigured = true;
  participants = 0;
  ended: string[] = [];

  async create() {}

  async mintJoinToken() {
    return {
      url: 'wss://test.invalid',
      token: 'test-token',
      expiresAt: new Date(Date.now() + 60_000),
    };
  }

  async countParticipants() {
    return this.participants;
  }

  async end(call: { id: string }) {
    this.ended.push(call.id);
  }
}

// A single-call, in-memory stand-in for the calls table, enforcing the same
// status-transition guards as the real WHERE clauses (activate/decline/end
// only ever move a call forward, never resurrect a resolved one) — a fake
// that always succeeds would hide exactly the kind of state bug this exists
// to catch.
class FakeCallsRepository extends CallsRepository {
  record: CallRecord | undefined;

  constructor(private readonly channelMembers: Map<string, WorkspaceMember[]>) {
    super();
  }

  seed(record: CallRecord) {
    this.record = record;
  }

  async insert(input: {
    id: string;
    workspaceId: string;
    channelId: string;
    roomName: string;
    startedByMemberId: string;
  }): Promise<CallRecord> {
    if (this.record && ACTIVE_STATUSES.has(this.record.status)) {
      throw new ConflictException('Channel already has an ongoing call');
    }
    this.record = { ...input, status: 'ringing', startedAt: new Date(), endedAt: null };
    return this.record;
  }

  async findActive(channelId: string) {
    return this.record &&
      this.record.channelId === channelId &&
      ACTIVE_STATUSES.has(this.record.status)
      ? this.record
      : undefined;
  }

  async findOwn(input: { workspaceId: string; channelId: string; callId: string }) {
    return this.record?.id === input.callId &&
      this.record.channelId === input.channelId &&
      this.record.workspaceId === input.workspaceId
      ? this.record
      : undefined;
  }

  async activate(callId: string) {
    if (this.record?.id === callId && this.record.status === 'ringing') {
      this.record = { ...this.record, status: 'active' };
      return this.record;
    }
    return undefined;
  }

  async decline(callId: string) {
    if (this.record?.id === callId && ACTIVE_STATUSES.has(this.record.status)) {
      this.record = { ...this.record, status: 'declined', endedAt: new Date() };
      return this.record;
    }
    return undefined;
  }

  async end(callId: string) {
    if (this.record?.id === callId && ACTIVE_STATUSES.has(this.record.status)) {
      this.record = { ...this.record, status: 'ended', endedAt: new Date() };
      return this.record;
    }
    return undefined;
  }

  async sweepStale(channelId: string, olderThan: Date) {
    if (
      this.record &&
      this.record.channelId === channelId &&
      this.record.status === 'ringing' &&
      this.record.startedAt < olderThan
    ) {
      this.record = { ...this.record, status: 'missed', endedAt: new Date() };
      return this.record;
    }
    return undefined;
  }

  async ringRecipients(channelId: string, excludeMemberId: string | null) {
    const members = this.channelMembers.get(channelId) ?? [];
    return members
      .filter((candidate) => candidate.id !== excludeMemberId)
      .map((candidate) => candidate.profile.oidcUserId);
  }
}

function member(id: string): WorkspaceMember {
  return {
    id,
    workspaceId: 'workspace-1',
    userProfileId: `profile-${id}`,
    profile: { id: `profile-${id}`, oidcUserId: `${id}-oidc`, displayName: id, avatarPath: null },
    role: 'member',
    status: 'active',
    leftAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const dm: ChannelAccessSnapshot = {
  id: 'channel-dm',
  workspaceId: 'workspace-1',
  kind: 'dm',
  createdByMemberId: 'caller',
  lastEntrySeq: 0n,
};
const group: ChannelAccessSnapshot = {
  id: 'channel-group',
  workspaceId: 'workspace-1',
  kind: 'public',
  createdByMemberId: 'starter',
  lastEntrySeq: 0n,
};

const caller = member('caller');
const callee = member('callee');
const starter = member('starter');
const joiner = member('joiner');
const bystander = member('bystander');

function ringingCall(
  channel: ChannelAccessSnapshot,
  startedBy: WorkspaceMember,
  startedAt = new Date(),
): CallRecord {
  return {
    id: 'call-1',
    workspaceId: channel.workspaceId,
    channelId: channel.id,
    roomName: 'room-call-1',
    status: 'ringing',
    startedByMemberId: startedBy.id,
    startedAt,
    endedAt: null,
  };
}

let repository: FakeCallsRepository;
let provider: FakeCallProvider;
let signals: RecordingEventPublisher;
let calls: CallsService;

memoryTransactionHost();

beforeEach(() => {
  repository = new FakeCallsRepository(
    new Map([
      [dm.id, [caller, callee]],
      [group.id, [starter, joiner, bystander]],
    ]),
  );
  provider = new FakeCallProvider();
  signals = new RecordingEventPublisher();
  const channelAccess = new ChannelAccessFacade(
    new FakeChannelAccessRepository(
      new Map([
        [dm.id, dm],
        [group.id, group],
      ]),
      new Map([
        [dm.id, new Set([caller.id, callee.id])],
        [group.id, new Set([starter.id, joiner.id, bystander.id])],
      ]),
    ),
  );
  const entries = new EntriesFacade(new FakeEntriesRepository());
  const lifecycle = new CallLifecycle(repository, new CallSignals(repository, signals), provider);
  const placement = new CallPlacement(repository, entries, signals, provider);
  calls = new CallsService(channelAccess, lifecycle, placement, provider);
});

test('join: the starter joining their own ringing call answers nobody', async () => {
  repository.seed(ringingCall(dm, caller));

  await calls.join(caller, dm.id, 'call-1', 'test-token');

  assert.equal(repository.record?.status, 'ringing');
  assert.deepEqual(signals.recipientsOf('call:accepted'), []);
});

test('join: someone else joining activates the call and reaches both sides', async () => {
  repository.seed(ringingCall(dm, caller));

  await calls.join(callee, dm.id, 'call-1', 'test-token');

  assert.equal(repository.record?.status, 'active');
  assert.deepEqual(
    new Set(signals.recipientsOf('call:accepted')),
    new Set([caller.profile.oidcUserId, callee.profile.oidcUserId]),
  );
});

test('decline: in a DM, ends the call and reaches both sides', async () => {
  repository.seed(ringingCall(dm, caller));

  await calls.decline(callee, dm.id, 'call-1', 'test-token');

  assert.equal(repository.record?.status, 'declined');
  assert.deepEqual(provider.ended, ['call-1']);
  assert.deepEqual(
    new Set(signals.recipientsOf('call:declined')),
    new Set([caller.profile.oidcUserId, callee.profile.oidcUserId]),
  );
});

test('decline: in a channel, is a personal no-op that never ends the call', async () => {
  repository.seed(ringingCall(group, starter));

  await calls.decline(bystander, group.id, 'call-1', 'test-token');

  assert.equal(repository.record?.status, 'ringing', 'declining a group call must not resolve it');
  assert.deepEqual(provider.ended, []);
  assert.deepEqual(signals.recipientsOf('call:declined'), [], 'nobody should hear about it at all');
});

test('leave: in a DM, ends the call immediately even if the media room still reports the other side', async () => {
  repository.seed({ ...ringingCall(dm, caller), status: 'active' });
  provider.participants = 1; // LiveKit still reports the other side connected

  await calls.leave(callee, dm.id, 'call-1', 'test-token');

  assert.equal(repository.record?.status, 'ended');
  assert.deepEqual(provider.ended, ['call-1']);
  assert.deepEqual(
    new Set(signals.recipientsOf('call:ended')),
    new Set([caller.profile.oidcUserId, callee.profile.oidcUserId]),
    'both the remaining party and the one who left must hear the call ended',
  );
});

test('leave: in a group call, waits for the media room to actually empty', async () => {
  repository.seed({ ...ringingCall(group, starter), status: 'active' });

  provider.participants = 1; // others still in the room
  await calls.leave(joiner, group.id, 'call-1', 'test-token');
  assert.equal(repository.record?.status, 'active', 'the call must survive while others remain');
  assert.deepEqual(signals.recipientsOf('call:ended'), []);
  assert.deepEqual(provider.ended, [], 'the media room must stay open for those still in it');

  provider.participants = 0; // the room is now confirmed empty
  await calls.leave(bystander, group.id, 'call-1', 'test-token');
  assert.equal(repository.record?.status, 'ended');
  assert.ok(
    signals.recipientsOf('call:ended').includes(starter.profile.oidcUserId),
    'ending must reach the starter, who triggered nothing themselves',
  );
});

test('a ring nobody answers is swept to missed and reaches whoever polled, including themselves', async () => {
  const startedAt = new Date(Date.now() - 120_000); // well past the ring TTL
  repository.seed(ringingCall(dm, caller, startedAt));

  // The caller's own client is what happens to poll — e.g. the ringback
  // sound's periodic check — and must still hear its own call went missed.
  await calls.active(caller, dm.id, 'test-token');

  assert.equal(repository.record?.status, 'missed');
  assert.deepEqual(
    new Set(signals.recipientsOf('call:missed')),
    new Set([caller.profile.oidcUserId, callee.profile.oidcUserId]),
    "the caller's own trigger must not exclude themselves",
  );
  assert.deepEqual(provider.ended, ['call-1'], 'a missed ring must also close its media room');
});

test('a ring within the TTL is left alone', async () => {
  repository.seed(ringingCall(dm, caller, new Date()));

  await calls.active(caller, dm.id, 'test-token');

  assert.equal(repository.record?.status, 'ringing');
  assert.deepEqual(signals.recipientsOf('call:missed'), []);
});

test('start: calling into a channel with a live call returns it without ringing again', async () => {
  repository.seed({ ...ringingCall(group, starter), status: 'active' });

  const view = await calls.start(joiner, group.id, 'test-token');

  assert.equal(view.id, 'call-1');
  assert.deepEqual(signals.recipientsOf('call:incoming'), []);
});

test('join: answering a ring past its TTL that nobody swept yet is refused and marks it missed', async () => {
  const startedAt = new Date(Date.now() - 120_000);
  repository.seed(ringingCall(dm, caller, startedAt));

  await assert.rejects(calls.join(callee, dm.id, 'call-1', 'test-token'), /no longer available/);

  assert.equal(repository.record?.status, 'missed');
  assert.deepEqual(signals.recipientsOf('call:accepted'), []);
});

test('start: rings everyone in the channel except the caller', async () => {
  const view = await calls.start(starter, group.id, 'test-token');

  assert.equal(view.status, 'ringing');
  assert.deepEqual(
    new Set(signals.recipientsOf('call:incoming')),
    new Set([joiner.profile.oidcUserId, bystander.profile.oidcUserId]),
  );
});
