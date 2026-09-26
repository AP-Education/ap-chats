import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DrizzleService } from '@/database/drizzle';
import { workspaceMembers } from '@/database/drizzle/schema';

import type { WorkspaceMember } from '../types';
import { WorkspaceMembersRepository } from './workspace-members.repository';

@Injectable()
export class DrizzleWorkspaceMembersRepository extends WorkspaceMembersRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async findAllForWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    const rows = await this.drizzle.db
      .select()
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.status, 'active')),
      );
    return rows.map((row) => this.toModel(row));
  }

  async findForUser(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined> {
    const [member] = await this.drizzle.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.status, 'active'),
        ),
      );

    return member && this.toModel(member);
  }

  async findById(workspaceId: string, memberId: string): Promise<WorkspaceMember | undefined> {
    const [member] = await this.drizzle.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.status, 'active'),
        ),
      );
    return member && this.toModel(member);
  }

  async remove(workspaceId: string, userId: string): Promise<void> {
    await this.drizzle.db
      .update(workspaceMembers)
      .set({ status: 'removed', leftAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.status, 'active'),
        ),
      );
  }

  private toModel(row: typeof workspaceMembers.$inferSelect): WorkspaceMember {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      role: row.role,
      status: row.status,
      leftAt: row.leftAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
