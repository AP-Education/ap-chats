import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import type { AuthenticatedUser } from '../access-token';
import { AccountsTokenVerifier } from '../accounts-token-verifier.service';

export type AuthenticatedRequest = FastifyRequest & { principal?: AuthenticatedUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: AccountsTokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = typeof header === 'string' ? /^Bearer\s+(\S+)$/i.exec(header)?.[1] : undefined;

    if (!token || token.length > 16_384) {
      throw new UnauthorizedException('Bearer token required');
    }

    try {
      request.principal = await this.tokens.verify(token);
      return true;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
