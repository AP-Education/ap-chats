import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { DrizzleModule } from '@/database/drizzle';

import { WorkspaceAccessModule } from '../access/workspace-access.module';
import { WorkspaceMembersModule } from '../members/workspace-members.module';
import { RolesModule } from '../roles/roles.module';
import { DrizzleRoleMembersRepository } from './repository/drizzle-role-members.repository';
import { RoleMembersRepository } from './repository/role-members.repository';
import { RoleMembersController } from './role-members.controller';
import { RoleMembersService } from './role-members.service';

@Module({
  imports: [AuthModule, DrizzleModule, WorkspaceMembersModule, WorkspaceAccessModule, RolesModule],
  controllers: [RoleMembersController],
  providers: [
    RoleMembersService,
    { provide: RoleMembersRepository, useClass: DrizzleRoleMembersRepository },
  ],
})
export class RoleMembersModule {}
