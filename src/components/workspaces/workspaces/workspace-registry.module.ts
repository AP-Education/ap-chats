import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { DrizzleModule } from '@/database/drizzle';

import { WorkspaceMembersModule } from '../members/workspace-members.module';
import { DrizzleWorkspacesRepository, WorkspacesRepository } from './repository';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

/** The workspaces themselves: opening, listing, renaming and closing them. */
@Module({
  imports: [AuthModule, DrizzleModule, WorkspaceMembersModule],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    { provide: WorkspacesRepository, useClass: DrizzleWorkspacesRepository },
  ],
})
export class WorkspaceRegistryModule {}
