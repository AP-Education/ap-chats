import { Module } from '@nestjs/common';

import { WorkspacesModule } from '@/components/workspaces';

import { TypingGateway } from './typing.gateway';

@Module({
  imports: [WorkspacesModule],
  providers: [TypingGateway],
})
export class TypingModule {}
