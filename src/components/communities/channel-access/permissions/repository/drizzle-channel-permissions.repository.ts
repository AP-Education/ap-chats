import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, eq, sql } from 'drizzle-orm';

import type { Principal } from '@/components/workspaces/access/types';
import { throwNotFoundOnMissingReference } from '@/database/drizzle/pg-errors';
import { channelGrants, roles, userProfiles, workspaceMembers } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import {
  channelCapabilities,
  type ChannelCapability,
  type ChannelPermissions,
  type ChannelPermissionsView,
  type PrincipalView,
} from '../types';
import { ChannelPermissionsRepository } from './channel-permissions.repository';

type GrantRow = typeof channelGrants.$inferInsert;

@Injectable()
export class DrizzleChannelPermissionsRepository extends ChannelPermissionsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async describe(workspaceId: string, channelId: string): Promise<ChannelPermissionsView> {
    const principalOrder = sql`case ${channelGrants.principal} when 'everyone' then 0 when 'role' then 1 else 2 end`;
    const rows = await this.txHost.tx
      .select({
        capability: channelGrants.capability,
        principal: channelGrants.principal,
        role: { id: roles.id, name: roles.name, color: roles.color },
        member: {
          id: workspaceMembers.id,
          displayName: userProfiles.displayName,
          avatarPath: userProfiles.avatarPath,
        },
      })
      .from(channelGrants)
      .leftJoin(roles, eq(roles.id, channelGrants.roleId))
      .leftJoin(
        workspaceMembers,
        and(eq(workspaceMembers.id, channelGrants.memberId), eq(workspaceMembers.status, 'active')),
      )
      .leftJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(eq(channelGrants.workspaceId, workspaceId), eq(channelGrants.channelId, channelId)),
      )
      .orderBy(principalOrder, asc(roles.name), asc(userProfiles.displayName));

    const view: ChannelPermissionsView = { view: [], post: [], manage: [] };
    for (const row of rows) {
      const principal = this.toPrincipalView(row);
      if (principal) view[row.capability].push(principal);
    }
    return view;
  }

  @Transactional()
  async replace(
    workspaceId: string,
    channelId: string,
    permissions: ChannelPermissions,
  ): Promise<void> {
    await this.txHost.tx
      .delete(channelGrants)
      .where(
        and(eq(channelGrants.workspaceId, workspaceId), eq(channelGrants.channelId, channelId)),
      );

    const grants = channelCapabilities.flatMap((capability) =>
      permissions[capability].map((principal) =>
        this.toGrantRow(workspaceId, channelId, capability, principal),
      ),
    );
    const distinct = [...new Map(grants.map((grant) => [this.grantKey(grant), grant])).values()];
    if (!distinct.length) return;

    try {
      await this.txHost.tx.insert(channelGrants).values(distinct);
    } catch (error) {
      throwNotFoundOnMissingReference(error, 'Role or member not found');
    }
  }

  private toGrantRow(
    workspaceId: string,
    channelId: string,
    capability: ChannelCapability,
    principal: Principal,
  ): GrantRow {
    const grant = { workspaceId, channelId, capability, principal: principal.kind };
    switch (principal.kind) {
      case 'everyone':
        return grant;
      case 'role':
        return { ...grant, roleId: principal.roleId };
      case 'member':
        return { ...grant, memberId: principal.memberId };
    }
  }

  private grantKey(grant: GrantRow): string {
    return [grant.capability, grant.principal, grant.roleId ?? '', grant.memberId ?? ''].join(':');
  }

  private toPrincipalView(row: {
    principal: Principal['kind'];
    role: { id: string; name: string; color: string | null } | null;
    member: { id: string | null; displayName: string | null; avatarPath: string | null };
  }): PrincipalView | undefined {
    if (row.principal === 'everyone') return { kind: 'everyone' };
    if (row.principal === 'role' && row.role)
      return { kind: 'role', roleId: row.role.id, name: row.role.name, color: row.role.color };
    if (row.principal === 'member' && row.member.id)
      return {
        kind: 'member',
        memberId: row.member.id,
        displayName: row.member.displayName,
        avatarPath: row.member.avatarPath,
      };
    return undefined;
  }
}
