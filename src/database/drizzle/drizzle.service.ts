import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

import { AppConfigService } from '../../globals/config/config.service';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  readonly db: NodePgDatabase<typeof schema>;
  private readonly pool: Pool;

  constructor(config: AppConfigService) {
    this.pool = new Pool({ connectionString: config.get('DATABASE_URL') });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleInit(): Promise<void> {
    await migrate(this.db, { migrationsFolder: './drizzle' });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
