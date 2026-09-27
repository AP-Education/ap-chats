import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspacesModule } from '@/components/workspaces';
import { DrizzleModule } from '@/database/drizzle';

import { DirectMessagesController } from './direct-messages.controller';
import { DirectMessagesService } from './direct-messages.service';

@Module({
  imports: [AuthModule, WorkspacesModule, DrizzleModule],
  controllers: [DirectMessagesController],
  providers: [DirectMessagesService],
})
export class DirectMessagesModule {}
