import { Module } from '@nestjs/common';

import { EntriesFacade } from './entries.facade';
import { DrizzleEntriesRepository } from './repository/drizzle-entries.repository';
import { EntriesRepository } from './repository/entries.repository';

@Module({
  providers: [EntriesFacade, { provide: EntriesRepository, useClass: DrizzleEntriesRepository }],
  exports: [EntriesFacade],
})
export class EntriesModule {}
