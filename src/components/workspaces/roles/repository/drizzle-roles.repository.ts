import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { throwConflictOnUnique } from '@/database/drizzle/pg-errors';
import { roleMembers, roles, userProfiles, workspaceMembers } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { Role, RoleBadge, RoleMember } from '../types';
import { RolesRepository } from './roles.repository';

@Injectable()
export class DrizzleRolesRepository extends RolesRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async findAllForWorkspace(workspaceId: string): Promise<Role[]> {
    const rows = await this.withMemberCount()
      .where(eq(roles.workspaceId, workspaceId))
      .orderBy(asc(roles.position), asc(roles.name));
    return rows.map((row) => this.toModel(row.role, row.memberCount));
  }

  async findById(workspaceId: string, roleId: string): Promise<Role | undefined> {
    const [row] = await this.withMemberCount().where(
      and(eq(roles.workspaceId, workspaceId), eq(roles.id, roleId)),
    );
    return row && this.toModel(row.role, row.memberCount);
  }

  async create(workspaceId: string, values: { name: string; color: string | null }): Promise<Role> {
    const lastPosition = this.txHost.tx
      .select({ next: sql<number>`coalesce(max(${roles.position}) + 1, 0)` })
      .from(roles)
      .where(eq(roles.workspaceId, workspaceId));

    try {
      const [role] = await this.txHost.tx
        .insert(roles)
        .values({ workspaceId, ...values, position: sql`(${lastPosition})` })
        .returning();
      if (!role) throw new Error('Role insert did not return a row');
      return this.toModel(role, 0);
    } catch (error) {
      return throwConflictOnUnique(error, 'Role name already exists');
    }
  }

  async update(
    workspaceId: string,
    roleId: string,
    changes: { name?: string; color?: string | null; isHoisted?: boolean },
  ): Promise<Role | undefined> {
    try {
      const [role] = await this.txHost.tx
        .update(roles)
        .set({ ...changes, updatedAt: new Date() })
        .where(and(eq(roles.workspaceId, workspaceId), eq(roles.id, roleId)))
        .returning({ id: roles.id });
      return role && this.findById(workspaceId, role.id);
    } catch (error) {
      return throwConflictOnUnique(error, 'Role name already exists');
    }
  }

  async reorder(workspaceId: string, roleIds: string[]): Promise<void> {
    const positions = sql.join(
      roleIds.map((id, index) => sql`when ${id}::uuid then ${index}`),
      sql` `,
    );
    await this.txHost.tx
      .update(roles)
      .set({
        position: sql`case ${roles.id} ${positions} else ${roleIds.length} + ${roles.position} end`,
        updatedAt: new Date(),
      })
      .where(eq(roles.workspaceId, workspaceId));
  }

  badgesOf(workspaceId: string, memberId: string): Promise<RoleBadge[]> {
    return this.txHost.tx
      .select({ id: roles.id, name: roles.name, color: roles.color })
      .from(roleMembers)
      .innerJoin(roles, eq(roles.id, roleMembers.roleId))
      .where(and(eq(roleMembers.workspaceId, workspaceId), eq(roleMembers.memberId, memberId)))
      .orderBy(asc(roles.position), asc(roles.name));
  }

  @Transactional()
  async remove(workspaceId: string, roleId: string): Promise<string[] | undefined> {
    const [role] = await this.txHost.tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.workspaceId, workspaceId), eq(roles.id, roleId)))
      .for('update');
    if (!role) return undefined;

    const formerMembers = await this.txHost.tx
      .select({ memberId: roleMembers.memberId })
      .from(roleMembers)
      .where(eq(roleMembers.roleId, roleId));

    await this.txHost.tx.delete(roles).where(eq(roles.id, roleId));

    return formerMembers.map(({ memberId }) => memberId);
  }

  members(workspaceId: string, roleId: string): Promise<RoleMember[]> {
    return this.txHost.tx
      .select({
        memberId: workspaceMembers.id,
        displayName: userProfiles.displayName,
        avatarPath: userProfiles.avatarPath,
      })
      .from(roleMembers)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, roleMembers.memberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(roleMembers.workspaceId, workspaceId),
          eq(roleMembers.roleId, roleId),
          eq(workspaceMembers.status, 'active'),
        ),
      )
      .orderBy(asc(userProfiles.displayName));
  }

  async addMembers(workspaceId: string, roleId: string, memberIds: string[]): Promise<string[]> {
    const added = await this.txHost.tx
      .insert(roleMembers)
      .select(
        this.txHost.tx
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
          ),
      )
      .onConflictDoNothing()
      .returning({ memberId: roleMembers.memberId });
    return added.map(({ memberId }) => memberId);
  }

  async removeMember(workspaceId: string, roleId: string, memberId: string): Promise<boolean> {
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

  private withMemberCount() {
    return this.txHost.tx
      .select({ role: roles, memberCount: sql<number>`count(${workspaceMembers.id})::int` })
      .from(roles)
      .leftJoin(roleMembers, eq(roleMembers.roleId, roles.id))
      .leftJoin(
        workspaceMembers,
        and(eq(workspaceMembers.id, roleMembers.memberId), eq(workspaceMembers.status, 'active')),
      )
      .groupBy(roles.id)
      .$dynamic();
  }

  private toModel(row: typeof roles.$inferSelect, memberCount: number): Role {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      color: row.color,
      position: row.position,
      isHoisted: row.isHoisted,
      memberCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
