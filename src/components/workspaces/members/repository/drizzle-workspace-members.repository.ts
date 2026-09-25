import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DrizzleService } from '@/database/drizzle';
import { workspaceMembers } from '@/database/drizzle/schema';

import { type WorkspaceMember, WorkspaceMembersRepository } from './workspace-members.repository';

@Injectable()
export class DrizzleWorkspaceMembersRepository extends WorkspaceMembersRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  findAllForWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.drizzle.db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
  }

  async findForUser(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined> {
    const [member] = await this.drizzle.db
      .select()
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      );

    return member;
  }

  async remove(workspaceId: string, userId: string): Promise<void> {
    await this.drizzle.db
      .delete(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      );
  }
}
