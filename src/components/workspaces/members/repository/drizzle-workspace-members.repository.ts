import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, ilike, inArray, ne } from 'drizzle-orm';

import { userProfiles, workspaceMembers } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { WorkspaceMember } from '../types';
import { WorkspaceMembersRepository } from './workspace-members.repository';

@Injectable()
export class DrizzleWorkspaceMembersRepository extends WorkspaceMembersRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async findAllForWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    const rows = await this.txHost.tx
      .select({ member: workspaceMembers, profile: userProfiles })
      .from(workspaceMembers)
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.status, 'active')),
      );
    return rows.map((row) => this.toModel(row.member, row.profile));
  }

  search(workspaceId: string, viewerId: string, query: string) {
    const escaped = query.replace(/[\\%_]/gu, '\\$&');
    return this.txHost.tx
      .select({
        memberId: workspaceMembers.id,
        displayName: userProfiles.displayName,
        avatarPath: userProfiles.avatarPath,
      })
      .from(workspaceMembers)
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.status, 'active'),
          ne(workspaceMembers.id, viewerId),
          ilike(userProfiles.displayName, `%${escaped}%`),
        ),
      )
      .orderBy(userProfiles.displayName)
      .limit(20);
  }

  async findForUser(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined> {
    const [member] = await this.txHost.tx
      .select({ member: workspaceMembers, profile: userProfiles })
      .from(workspaceMembers)
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(userProfiles.oidcUserId, userId),
          eq(workspaceMembers.status, 'active'),
        ),
      );

    return member && this.toModel(member.member, member.profile);
  }

  async findById(workspaceId: string, memberId: string): Promise<WorkspaceMember | undefined> {
    const [member] = await this.txHost.tx
      .select({ member: workspaceMembers, profile: userProfiles })
      .from(workspaceMembers)
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.status, 'active'),
        ),
      );
    return member && this.toModel(member.member, member.profile);
  }

  async remove(workspaceId: string, userId: string): Promise<void> {
    await this.txHost.tx
      .update(workspaceMembers)
      .set({ status: 'removed', leftAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          inArray(
            workspaceMembers.userProfileId,
            this.txHost.tx
              .select({ id: userProfiles.id })
              .from(userProfiles)
              .where(eq(userProfiles.oidcUserId, userId)),
          ),
          eq(workspaceMembers.status, 'active'),
        ),
      );
  }

  private toModel(
    row: typeof workspaceMembers.$inferSelect,
    profile: typeof userProfiles.$inferSelect,
  ): WorkspaceMember {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userProfileId: row.userProfileId,
      profile: {
        id: profile.id,
        oidcUserId: profile.oidcUserId,
        displayName: profile.displayName,
        avatarPath: profile.avatarPath,
      },
      role: row.role,
      status: row.status,
      leftAt: row.leftAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
