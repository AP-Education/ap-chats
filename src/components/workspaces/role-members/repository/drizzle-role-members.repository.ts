import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import {
  activeRoleMembers,
  roleMembers,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { MemberSummary } from '../../members/types';
import { RoleMembersRepository } from './role-members.repository';

@Injectable()
export class DrizzleRoleMembersRepository extends RoleMembersRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  holders(workspaceId: string, roleId: string): Promise<MemberSummary[]> {
    return this.txHost.tx
      .select({
        memberId: activeRoleMembers.memberId,
        displayName: userProfiles.displayName,
        avatarPath: userProfiles.avatarPath,
        isBot: userProfiles.isBot,
      })
      .from(activeRoleMembers)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, activeRoleMembers.memberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(eq(activeRoleMembers.workspaceId, workspaceId), eq(activeRoleMembers.roleId, roleId)),
      )
      .orderBy(asc(userProfiles.displayName));
  }

  async enroll(workspaceId: string, roleId: string, memberIds: string[]): Promise<string[]> {
    const activePeople = this.txHost.tx
      .select({
        workspaceId: workspaceMembers.workspaceId,
        roleId: sql<string>`${roleId}::uuid`.as('role_id'),
        memberId: workspaceMembers.id,
        createdAt: sql<Date>`now()`.as('created_at'),
      })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          inArray(workspaceMembers.id, memberIds),
          eq(workspaceMembers.status, 'active'),
        ),
      );

    const added = await this.txHost.tx
      .insert(roleMembers)
      .select(activePeople)
      .onConflictDoNothing()
      .returning({ memberId: roleMembers.memberId });
    return added.map(({ memberId }) => memberId);
  }

  async release(workspaceId: string, roleId: string, memberId: string): Promise<boolean> {
    const removed = await this.txHost.tx
      .delete(roleMembers)
      .where(
        and(
          eq(roleMembers.workspaceId, workspaceId),
          eq(roleMembers.roleId, roleId),
          eq(roleMembers.memberId, memberId),
        ),
      )
      .returning({ memberId: roleMembers.memberId });
    return removed.length > 0;
  }
}
