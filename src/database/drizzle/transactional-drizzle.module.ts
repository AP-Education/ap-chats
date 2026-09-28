import { Module } from '@nestjs/common';
import { ClsPluginTransactional, type TransactionalAdapter } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { ClsModule } from 'nestjs-cls';

import { DRIZZLE_DB, DrizzleModule } from './drizzle.module';
import type { DrizzleService } from './drizzle.service';

export type DrizzleTransactionAdapter = TransactionalAdapter<
  DrizzleService['db'],
  DrizzleService['db'],
  object
>;

@Module({
  imports: [
    ClsModule.forRoot({
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [DrizzleModule],
          // Adapter package exposes an optional options type incompatible with exactOptionalPropertyTypes.
          adapter: new TransactionalAdapterDrizzleOrm<DrizzleService['db']>({
            drizzleInstanceToken: DRIZZLE_DB,
          }) as unknown as DrizzleTransactionAdapter,
        }),
      ],
    }),
  ],
})
export class TransactionalDrizzleModule {}
