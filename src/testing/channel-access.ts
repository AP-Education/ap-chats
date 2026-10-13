import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access/channel-access.policy';
import { DrizzleChannelAccessRepository } from '@/components/communities/channel-access/channel-access/repository/drizzle-channel-access.repository';
import { ChannelPermissionsService } from '@/components/communities/channel-access/permissions/channel-permissions.service';
import { ChannelVisibility } from '@/components/communities/channel-access/permissions/channel-visibility.service';
import { DrizzleChannelPermissionsRepository } from '@/components/communities/channel-access/permissions/repository/drizzle-channel-permissions.repository';
import { ChannelAccessSync } from '@/components/communities/channel-access/sync/channel-access.sync';
import { DrizzleParticipationRepository } from '@/components/communities/channel-access/sync/repository/drizzle-participation.repository';
import { DrizzleChannelCategoriesRepository } from '@/components/communities/channel-categories/repository';
import { ChannelDirectoryService } from '@/components/communities/channel-directory/channel-directory.service';
import { DrizzleChannelsRepository } from '@/components/communities/channels/repository';
import { ChannelMembershipsService } from '@/components/communities/memberships/channel-memberships.service';
import { DrizzleChannelMembershipsRepository } from '@/components/communities/memberships/repository';
import { DrizzleWorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import { WorkspaceMembersService } from '@/components/workspaces/members/workspace-members.service';
import { DrizzleRoleMembersRepository } from '@/components/workspaces/role-members/repository/drizzle-role-members.repository';
import { RoleMembersService } from '@/components/workspaces/role-members/role-members.service';
import { DrizzleRolesRepository } from '@/components/workspaces/roles/repository';
import { RolesFacade } from '@/components/workspaces/roles/roles.facade';
import { RolesService } from '@/components/workspaces/roles/roles.service';
import { EventPublisher } from '@/globals/publisher/event-publisher';

import { type TestDatabase, transactionHost } from './pglite';

/** Keeps what the code under test publishes, so a spec can read it back. */
export class RecordedEvents extends EventPublisher {
  private readonly published: { key: string; event: unknown }[] = [];

  publish<T>(key: string, event: T): void {
    this.published.push({ key, event });
  }

  lastOf<T>(key: string): T | undefined {
    return this.published.findLast((entry) => entry.key === key)?.event as T | undefined;
  }
}

/**
 * Workspaces and channel access composed the way their Nest modules compose them. Specs run under
 * tsx, which emits no decorator metadata, so Nest cannot inject them; this is the one place to rewire.
 */
export function channelAccessOnPostgres(db: TestDatabase) {
  const tx = transactionHost(db) as never;
  const events = new RecordedEvents();
  const sync = new ChannelAccessSync(new DrizzleParticipationRepository(tx), events);

  const rolesRepository = new DrizzleRolesRepository(tx);
  const channelsRepository = new DrizzleChannelsRepository(tx);
  const visibility = new ChannelVisibility(channelsRepository);
  const permissions = new ChannelPermissionsService(
    new DrizzleChannelPermissionsRepository(tx),
    sync,
    visibility,
  );

  return {
    events,
    people: new WorkspaceMembersService(new DrizzleWorkspaceMembersRepository(tx), sync),
    roles: new RolesService(rolesRepository, sync),
    roleMembers: new RoleMembersService(
      new DrizzleRoleMembersRepository(tx),
      new RolesFacade(rolesRepository),
      sync,
    ),
    directory: new ChannelDirectoryService(
      channelsRepository,
      new DrizzleChannelCategoriesRepository(tx),
      visibility,
      permissions,
    ),
    permissions,
    memberships: new ChannelMembershipsService(
      new DrizzleChannelMembershipsRepository(tx),
      visibility,
    ),
    policy: new ChannelAccessPolicy(new DrizzleChannelAccessRepository(tx)),
  };
}
