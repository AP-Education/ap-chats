import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

// The bearer AuthGuard already verified, for services that authorize the user themselves.
export const AccessToken = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const header = context.switchToHttp().getRequest<FastifyRequest>().headers.authorization ?? '';
  return header.replace(/^Bearer\s+/i, '');
});
