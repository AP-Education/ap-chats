import { Module } from '@nestjs/common';

import { WorkspaceAccessModule } from './access/workspace-access.module';
import { WorkspaceMembersModule } from './members/workspace-members.module';
import { RoleMembersModule } from './role-members/role-members.module';
import { RolesModule } from './roles/roles.module';
import { WorkspaceRegistryModule } from './workspaces/workspace-registry.module';

/** Brings workspaces into the app; others import the part they use. */
@Module({
  imports: [
    WorkspaceRegistryModule,
    WorkspaceMembersModule,
    WorkspaceAccessModule,
    RolesModule,
    RoleMembersModule,
  ],
})
export class WorkspacesModule {}
