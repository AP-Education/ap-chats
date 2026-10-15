import { Module } from '@nestjs/common';

import { AttachmentsModule } from './attachments';
import { ContentModule } from './content';
import { EntriesModule } from './entries';
import { ForwardingModule } from './forwarding';
import { HistoryModule } from './history';
import { MentionsModule } from './mentions';
import { MessagesModule } from './messages';
import { PinsModule } from './pins';
import { PostingModule } from './posting';
import { ReactionsModule } from './reactions';
import { ReadStateModule } from './read-state';
import { SocialRealtimeModule } from './realtime';

@Module({
  imports: [
    EntriesModule,
    ContentModule,
    MentionsModule,
    MessagesModule,
    AttachmentsModule,
    PinsModule,
    ReactionsModule,
    ReadStateModule,
    PostingModule,
    ForwardingModule,
    HistoryModule,
    SocialRealtimeModule,
  ],
})
export class SocialModule {}
