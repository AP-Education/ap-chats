import { Module } from '@nestjs/common';

import { EntriesModule } from './entries/entries.module';
import { ForwardingModule } from './forwarding/forwarding.module';
import { HistoryModule } from './history/history.module';
import { MentionsModule } from './mentions';
import { MessagesModule } from './messages';
import { PinsModule } from './pins/pins.module';
import { ReactionsModule } from './reactions/reactions.module';
import { ReadStateModule } from './read-state/read-state.module';

@Module({
  imports: [
    EntriesModule,
    MessagesModule,
    MentionsModule,
    PinsModule,
    ReactionsModule,
    ReadStateModule,
    ForwardingModule,
    HistoryModule,
  ],
})
export class SocialModule {}
