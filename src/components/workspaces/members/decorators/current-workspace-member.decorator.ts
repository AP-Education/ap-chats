import {
  createParamDecorator,
  type ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

import type { WorkspaceMemberRequest } from '../types';

export const CurrentWorkspaceMember = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const member = context.switchToHttp().getRequest<WorkspaceMemberRequest>().workspaceMember;
    if (!member) throw new InternalServerErrorException('WorkspaceMemberGuard is required');
    return member;
  },
);
