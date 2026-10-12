import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { DrizzleModule } from '@/database/drizzle';

import { MemberAccessProjections } from './access';
import {
  DrizzleWorkspaceMembersRepository,
  WorkspaceMembersRepository,
} from './members/repository';
import { WorkspaceMembersController } from './members/workspace-members.controller';
import { WorkspaceMembersService } from './members/workspace-members.service';
import { DrizzleRolesRepository, RolesRepository } from './roles/repository';
import { RolesController } from './roles/roles.controller';
import { RolesService } from './roles/roles.service';
import { DrizzleWorkspacesRepository, WorkspacesRepository } from './workspaces/repository';
import { WorkspacesController } from './workspaces/workspaces.controller';
import { WorkspacesService } from './workspaces/workspaces.service';

@Module({
  imports: [DrizzleModule, AuthModule],
  controllers: [WorkspacesController, WorkspaceMembersController, RolesController],
  providers: [
    WorkspacesService,
    { provide: WorkspacesRepository, useClass: DrizzleWorkspacesRepository },
    WorkspaceMembersService,
    { provide: WorkspaceMembersRepository, useClass: DrizzleWorkspaceMembersRepository },
    RolesService,
    { provide: RolesRepository, useClass: DrizzleRolesRepository },
    MemberAccessProjections,
  ],
  exports: [WorkspaceMembersRepository, MemberAccessProjections],
})
export class WorkspacesModule {}
