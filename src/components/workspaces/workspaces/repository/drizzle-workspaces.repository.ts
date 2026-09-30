import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { and, eq } from 'drizzle-orm';

import { userProfiles, workspaceMembers, workspaces } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import type { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import type { Workspace } from '../types';
import { WorkspacesRepository } from './workspaces.repository';

@Injectable()
export class DrizzleWorkspacesRepository extends WorkspacesRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  @Transactional()
  async create(ownerId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    const [insertedProfile] = await this.txHost.tx
      .insert(userProfiles)
      .values({ oidcUserId: ownerId })
      .onConflictDoNothing()
      .returning({ id: userProfiles.id });
    const [existingProfile] = insertedProfile
      ? [insertedProfile]
      : await this.txHost.tx
          .select({ id: userProfiles.id })
          .from(userProfiles)
          .where(eq(userProfiles.oidcUserId, ownerId));
    if (!existingProfile) throw new Error('User profile insert did not return a row');
    const [workspace] = await this.txHost.tx
      .insert(workspaces)
      .values({ name: dto.name, avatarPath: dto.avatarPath })
      .returning();
    if (!workspace) throw new Error('Workspace insert did not return a row');

    await this.txHost.tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userProfileId: existingProfile.id,
      role: 'owner',
    });
    return this.toModel(workspace);
  }

  async findAllForMember(userId: string): Promise<Workspace[]> {
    const rows = await this.txHost.tx
      .select({ workspace: workspaces })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(and(eq(userProfiles.oidcUserId, userId), eq(workspaceMembers.status, 'active')));

    return rows.map((row) => this.toModel(row.workspace));
  }

  async findById(id: string): Promise<Workspace | undefined> {
    const [workspace] = await this.txHost.tx.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace && this.toModel(workspace);
  }

  async update(id: string, dto: UpdateWorkspaceDto): Promise<Workspace> {
    const [workspace] = await this.txHost.tx
      .update(workspaces)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    if (!workspace) throw new Error('Workspace update did not return a row');
    return this.toModel(workspace);
  }

  async delete(id: string): Promise<void> {
    await this.txHost.tx.delete(workspaces).where(eq(workspaces.id, id));
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
