import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, eq } from 'drizzle-orm';

import { channelCategories, channels } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import { throwConflictOnUnique } from '../../repository/pg-unique-conflict';
import type { ChannelCategory } from '../types';
import { ChannelCategoriesRepository } from './channel-categories.repository';

@Injectable()
export class DrizzleChannelCategoriesRepository extends ChannelCategoriesRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async findAllForWorkspace(workspaceId: string): Promise<ChannelCategory[]> {
    const rows = await this.txHost.tx
      .select()
      .from(channelCategories)
      .where(eq(channelCategories.workspaceId, workspaceId))
      .orderBy(asc(channelCategories.position), asc(channelCategories.name));
    return rows.map((row) => this.toModel(row));
  }

  async findById(workspaceId: string, categoryId: string): Promise<ChannelCategory | undefined> {
    const [category] = await this.txHost.tx
      .select()
      .from(channelCategories)
      .where(
        and(eq(channelCategories.workspaceId, workspaceId), eq(channelCategories.id, categoryId)),
      );
    return category && this.toModel(category);
  }

  async create(workspaceId: string, name: string, position: number): Promise<ChannelCategory> {
    try {
      const [category] = await this.txHost.tx
        .insert(channelCategories)
        .values({ workspaceId, name, position })
        .returning();
      if (!category) throw new Error('Category insert did not return a row');
      return this.toModel(category);
    } catch (error) {
      return throwConflictOnUnique(error, 'Category name already exists');
    }
  }

  async update(
    workspaceId: string,
    categoryId: string,
    changes: { name?: string; position?: number },
  ): Promise<ChannelCategory | undefined> {
    try {
      const [category] = await this.txHost.tx
        .update(channelCategories)
        .set({ ...changes, updatedAt: new Date() })
        .where(
          and(eq(channelCategories.workspaceId, workspaceId), eq(channelCategories.id, categoryId)),
        )
        .returning();
      return category && this.toModel(category);
    } catch (error) {
      return throwConflictOnUnique(error, 'Category name already exists');
    }
  }

  @Transactional()
  async delete(workspaceId: string, categoryId: string): Promise<boolean> {
    const [category] = await this.txHost.tx
      .select({ id: channelCategories.id })
      .from(channelCategories)
      .where(
        and(eq(channelCategories.id, categoryId), eq(channelCategories.workspaceId, workspaceId)),
      )
      .for('update');
    if (!category) return false;
    await this.txHost.tx
      .update(channels)
      .set({ categoryId: null, updatedAt: new Date() })
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.categoryId, categoryId)));
    await this.txHost.tx.delete(channelCategories).where(eq(channelCategories.id, categoryId));
    return true;
  }

  private toModel(row: typeof channelCategories.$inferSelect): ChannelCategory {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
