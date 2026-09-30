import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { isNull, lte, or } from 'drizzle-orm';

import { AccountsTokenVerifier } from '@/components/auth';
import { userProfiles } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

@Injectable()
export class UserProfilesService {
  constructor(
    private readonly txHost: TransactionHost<DrizzleTransactionAdapter>,
    private readonly tokens: AccountsTokenVerifier,
  ) {}

  async sync(oidcUserId: string, appId: string, idToken: string): Promise<void> {
    let verified: Awaited<ReturnType<AccountsTokenVerifier['verifyProfile']>>;
    try {
      verified = await this.tokens.verifyProfile(idToken, oidcUserId, appId);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new BadRequestException('Invalid ID token profile');
    }
    const profile = {
      oidcUserId,
      displayName: verified.displayName,
      avatarPath: verified.avatarPath,
      syncedAt: verified.issuedAt,
    };
    await this.txHost.tx
      .insert(userProfiles)
      .values(profile)
      .onConflictDoUpdate({
        target: userProfiles.oidcUserId,
        set: {
          displayName: profile.displayName,
          avatarPath: profile.avatarPath,
          syncedAt: profile.syncedAt,
        },
        setWhere: or(isNull(userProfiles.syncedAt), lte(userProfiles.syncedAt, verified.issuedAt))!,
      });
  }
}
