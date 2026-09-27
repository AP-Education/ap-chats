import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

import { DrizzleService } from '@/database/drizzle';
import { userProfiles, workspaceMembers } from '@/database/drizzle/schema';

import type { WorkspaceMember } from '../types';
import { WorkspaceMembersRepository } from './workspace-members.repository';

@Injectable()
export class DrizzleWorkspaceMembersRepository extends WorkspaceMembersRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async findAllForWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    const rows = await this.drizzle.db
      .select({ member: workspaceMembers, profile: userProfiles })
      .from(workspaceMembers)
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.status, 'active')),
      );
    return rows.map((row) => this.toModel(row.member, row.profile));
  }

  async findForUser(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined> {
    const [member] = await this.drizzle.db
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
    const [member] = await this.drizzle.db
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
    await this.drizzle.db
      .update(workspaceMembers)
      .set({ status: 'removed', leftAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          inArray(
            workspaceMembers.userProfileId,
            this.drizzle.db
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
