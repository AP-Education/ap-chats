import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

import { AppConfigService } from '@/globals/config';

import { AttentionRepository } from './attention.repository';

// Clients renew every 20 seconds; a lease outlives one missed renewal.
const LEASE_MS = 45_000;

@Injectable()
export class ValkeyAttentionRepository extends AttentionRepository implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: AppConfigService) {
    super();
    this.client = new Redis(config.get('VALKEY_URL'), {
      keyPrefix: 'ap-connect:attention:',
      maxRetriesPerRequest: 1,
      commandTimeout: 5000,
    });
  }

  // One expiring entry per connection, so tabs never overwrite each other and a lost disconnect expires.
  async update(userId: string, connectionId: string, attending: boolean): Promise<void> {
    if (!attending) {
      await this.client.zrem(userId, connectionId);
      return;
    }

    const now = Date.now();
    await this.client
      .multi()
      .zremrangebyscore(userId, '-inf', now)
      .zadd(userId, now + LEASE_MS, connectionId)
      .pexpire(userId, LEASE_MS)
      .exec();
  }

  async isAttending(userId: string): Promise<boolean> {
    return (await this.client.zcount(userId, Date.now(), '+inf')) > 0;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
