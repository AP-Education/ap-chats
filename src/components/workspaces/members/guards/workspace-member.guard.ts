import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';

import { WorkspaceMembersRepository } from '../repository';
import type { WorkspaceMemberRequest } from '../types';

export type WorkspaceIdSource = 'param' | 'query' | 'body';

export function WorkspaceMemberGuard(source: WorkspaceIdSource, key: string) {
  @Injectable()
  class ExternalWorkspaceMemberGuard implements CanActivate {
    constructor(private readonly members: WorkspaceMembersRepository) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<WorkspaceMemberRequest>();
      if (!request.principal) throw new InternalServerErrorException('AuthGuard is required');

      const field =
        source === 'param' ? request.params : source === 'query' ? request.query : request.body;
      const workspaceId =
        field && typeof field === 'object' ? (field as Record<string, unknown>)[key] : undefined;
      if (typeof workspaceId !== 'string' || !isUUID(workspaceId)) {
        throw new BadRequestException('Invalid workspace ID');
      }

      const member = await this.members.findForUser(workspaceId, request.principal.sub);
      if (!member) throw new ForbiddenException('Not a member of this workspace');

      request.workspaceMember = member;
      return true;
    }
  }

  return ExternalWorkspaceMemberGuard;
}
