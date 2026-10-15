import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { DrizzleModule } from '@/database/drizzle';

import { WorkspaceMembersModule } from '../members/workspace-members.module';
import { DrizzleRolesRepository, RolesRepository } from './repository';
import { RolesController } from './roles.controller';
import { RolesFacade } from './roles.facade';
import { RolesService } from './roles.service';

@Module({
  imports: [AuthModule, DrizzleModule, WorkspaceMembersModule],
  controllers: [RolesController],
  providers: [
    RolesService,
    RolesFacade,
    { provide: RolesRepository, useClass: DrizzleRolesRepository },
  ],
  exports: [RolesFacade],
})
export class RolesModule {}
