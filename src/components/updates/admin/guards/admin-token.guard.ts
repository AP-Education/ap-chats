import { createHash, timingSafeEqual } from 'node:crypto';

import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AppConfigService } from '@/globals/config';

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Only CI holds this token: publishing and rolling back are never done from a person's machine. */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get('UPDATES_ADMIN_TOKEN');
    const header = context.switchToHttp().getRequest<FastifyRequest>().headers.authorization;
    const token = typeof header === 'string' ? /^Bearer\s+(\S+)$/iu.exec(header)?.[1] : undefined;

    // Digests have one length, so the comparison takes the same time whatever was sent.
    if (!expected || !token || !timingSafeEqual(digest(token), digest(expected)))
      throw new UnauthorizedException('Admin token required');
    return true;
  }
}
