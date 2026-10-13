import { Module } from '@nestjs/common';

import { EntriesModule } from '../entries';
import { MentionsModule } from '../mentions';
import { MessagesService } from './messages.service';
import { DrizzleMessagesRepository } from './repository/drizzle-messages.repository';
import { MessagesRepository } from './repository/messages.repository';

@Module({
  imports: [EntriesModule, MentionsModule],
  providers: [
    MessagesService,
    { provide: MessagesRepository, useClass: DrizzleMessagesRepository },
  ],
  exports: [MessagesService],
})
export class MessagesModule {}
