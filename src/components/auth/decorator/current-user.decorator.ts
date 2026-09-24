import {
  createParamDecorator,
  type ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../guards/auth.guard';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const user = context.switchToHttp().getRequest<AuthenticatedRequest>().principal;
  if (!user) throw new InternalServerErrorException('AuthGuard is required');
  return user;
});
