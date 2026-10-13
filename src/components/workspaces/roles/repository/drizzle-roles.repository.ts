import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { throwConflictOnUnique } from '@/database/drizzle/pg-errors';
import { activeRoleMembers, roles } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { Role } from '../types';
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

  async countInWorkspace(workspaceId: string, roleIds: string[]): Promise<number> {
    const [row] = await this.txHost.tx
      .select({ count: sql<number>`count(*)::int` })
      .from(roles)
      .where(and(eq(roles.workspaceId, workspaceId), inArray(roles.id, roleIds)));
    return row?.count ?? 0;
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

  @Transactional()
  async remove(workspaceId: string, roleId: string): Promise<string[] | undefined> {
    const [role] = await this.txHost.tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.workspaceId, workspaceId), eq(roles.id, roleId)))
      .for('update');
    if (!role) return undefined;

    const formerHolders = await this.txHost.tx
      .select({ memberId: activeRoleMembers.memberId })
      .from(activeRoleMembers)
      .where(eq(activeRoleMembers.roleId, roleId));

    await this.txHost.tx.delete(roles).where(eq(roles.id, roleId));

    return formerHolders.map(({ memberId }) => memberId);
  }

  private withMemberCount() {
    return this.txHost.tx
      .select({ role: roles, memberCount: sql<number>`count(${activeRoleMembers.memberId})::int` })
      .from(roles)
      .leftJoin(activeRoleMembers, eq(activeRoleMembers.roleId, roles.id))
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
