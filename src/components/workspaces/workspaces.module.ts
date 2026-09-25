import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { DrizzleModule } from '@/database/drizzle';

import {
  DrizzleWorkspaceMembersRepository,
  WorkspaceMembersRepository,
} from './members/repository';
import { WorkspaceMembersController } from './members/workspace-members.controller';
import { WorkspaceMembersService } from './members/workspace-members.service';
import { DrizzleWorkspacesRepository, WorkspacesRepository } from './workspaces/repository';
import { WorkspacesController } from './workspaces/workspaces.controller';
import { WorkspacesService } from './workspaces/workspaces.service';

@Module({
  imports: [DrizzleModule, AuthModule],
  controllers: [WorkspacesController, WorkspaceMembersController],
  providers: [
    WorkspacesService,
    { provide: WorkspacesRepository, useClass: DrizzleWorkspacesRepository },
    WorkspaceMembersService,
    { provide: WorkspaceMembersRepository, useClass: DrizzleWorkspaceMembersRepository },
  ],
})
export class WorkspacesModule {}
