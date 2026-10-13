import { Module } from '@nestjs/common';

import { DirectConversationsModule } from './conversations';
import { DirectInboxModule } from './inbox';

@Module({
  imports: [DirectConversationsModule, DirectInboxModule],
})
export class DirectMessagesModule {}
