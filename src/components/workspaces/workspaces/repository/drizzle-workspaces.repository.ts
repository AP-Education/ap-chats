import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DrizzleService } from '@/database/drizzle';
import { workspaceMembers, workspaces } from '@/database/drizzle/schema';

import type { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import type { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import type { Workspace } from '../types';
import { WorkspacesRepository } from './workspaces.repository';

@Injectable()
export class DrizzleWorkspacesRepository extends WorkspacesRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  create(ownerId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    return this.drizzle.db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({ name: dto.name, avatarPath: dto.avatarPath })
        .returning();
      if (!workspace) throw new Error('Workspace insert did not return a row');

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: ownerId,
        role: 'owner',
      });
      return this.toModel(workspace);
    });
  }

  async findAllForMember(userId: string): Promise<Workspace[]> {
    const rows = await this.drizzle.db
      .select({ workspace: workspaces })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.status, 'active')));

    return rows.map((row) => this.toModel(row.workspace));
  }

  async findById(id: string): Promise<Workspace | undefined> {
    const [workspace] = await this.drizzle.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id));
    return workspace && this.toModel(workspace);
  }

  async update(id: string, dto: UpdateWorkspaceDto): Promise<Workspace> {
    const [workspace] = await this.drizzle.db
      .update(workspaces)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    if (!workspace) throw new Error('Workspace update did not return a row');
    return this.toModel(workspace);
  }

  async delete(id: string): Promise<void> {
    await this.drizzle.db.delete(workspaces).where(eq(workspaces.id, id));
  }

  private toModel(row: typeof workspaces.$inferSelect): Workspace {
    return {
      id: row.id,
      name: row.name,
      avatarPath: row.avatarPath,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
