import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { DrizzleModule } from '@/database/drizzle';

import { DrizzleWorkspaceMembersRepository, WorkspaceMembersRepository } from './repository';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspaceMembersService } from './workspace-members.service';

/** Who belongs to a workspace; import it wherever a route runs `WorkspaceMemberGuard`. */
@Module({
  imports: [AuthModule, DrizzleModule],
  controllers: [WorkspaceMembersController],
  providers: [
    WorkspaceMembersService,
    { provide: WorkspaceMembersRepository, useClass: DrizzleWorkspaceMembersRepository },
  ],
  exports: [WorkspaceMembersRepository],
})
export class WorkspaceMembersModule {}
