import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BadRequestException,
  type ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';

import type { WorkspaceMembersRepository } from '../repository';
import type { WorkspaceMember } from '../types';
import { type WorkspaceIdSource, WorkspaceMemberGuard } from './workspace-member.guard';

const workspaceId = 'f0f01847-4bf7-46aa-8a95-8a270433c05a';

function context(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function guard(
  repository: WorkspaceMembersRepository,
  source: WorkspaceIdSource = 'param',
  key = 'workspaceId',
) {
  const Guard = WorkspaceMemberGuard(source, key);
  return new Guard(repository);
}

test('guard resolves active workspace member and exposes it on request', async () => {
  const member = {
    id: 'bbdeed14-2e7d-4d4b-b4eb-d7e170aeed94',
    workspaceId,
    userProfileId: 'profile-1',
    profile: {
      id: 'profile-1',
      oidcUserId: 'accounts-user',
      displayName: 'User',
      avatarPath: null,
    },
    role: 'member',
    status: 'active',
    leftAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies WorkspaceMember;
  const request: Record<string, unknown> = {
    principal: { sub: member.profile.oidcUserId },
    params: { workspaceId },
  };
  const repository = {
    findForUser: async (id: string, userId: string) => {
      assert.equal(id, workspaceId);
      assert.equal(userId, member.profile.oidcUserId);
      return member;
    },
  } as unknown as WorkspaceMembersRepository;

  assert.equal(await guard(repository).canActivate(context(request)), true);
  assert.equal(request.workspaceMember, member);
});

test('guard rejects requests without active workspace membership', async () => {
  const repository = {
    findForUser: async () => undefined,
  } as unknown as WorkspaceMembersRepository;
  const request = { principal: { sub: 'accounts-user' }, params: { workspaceId } };
  await assert.rejects(guard(repository).canActivate(context(request)), ForbiddenException);
});

test('guard validates workspace ID before querying repository', async () => {
  const repository = {
    findForUser: async () => {
      throw new Error('Repository must not be called');
    },
  } as unknown as WorkspaceMembersRepository;
  const request = { principal: { sub: 'accounts-user' }, params: { workspaceId: 'invalid' } };
  await assert.rejects(guard(repository).canActivate(context(request)), BadRequestException);
});

test('guard requires AuthGuard to run first', async () => {
  const repository = {} as WorkspaceMembersRepository;
  const request = { params: { workspaceId } };
  await assert.rejects(
    guard(repository).canActivate(context(request)),
    InternalServerErrorException,
  );
});

test('guard factory resolves configured request field', async () => {
  const member = { workspaceId } as WorkspaceMember;
  const repository = {
    findForUser: async (id: string) => {
      assert.equal(id, workspaceId);
      return member;
    },
  } as unknown as WorkspaceMembersRepository;
  const request: Record<string, unknown> = {
    principal: { sub: 'accounts-user' },
    query: { tenant: workspaceId },
  };

  assert.equal(await guard(repository, 'query', 'tenant').canActivate(context(request)), true);
  assert.equal(request.workspaceMember, member);
});
