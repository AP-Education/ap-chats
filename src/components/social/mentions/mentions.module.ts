import { Module } from '@nestjs/common';

import { MentionsFacade } from './mentions.facade';
import { DrizzleMentionsRepository } from './repository/drizzle-mentions.repository';
import { MentionsRepository } from './repository/mentions.repository';

@Module({
  providers: [MentionsFacade, { provide: MentionsRepository, useClass: DrizzleMentionsRepository }],
  exports: [MentionsFacade],
})
export class MentionsModule {}
