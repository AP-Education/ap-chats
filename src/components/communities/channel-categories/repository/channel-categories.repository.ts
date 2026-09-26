import type { ChannelCategory } from '../types';

export abstract class ChannelCategoriesRepository {
  abstract findAllForWorkspace(workspaceId: string): Promise<ChannelCategory[]>;
  abstract findById(workspaceId: string, categoryId: string): Promise<ChannelCategory | undefined>;
  abstract create(workspaceId: string, name: string, position: number): Promise<ChannelCategory>;
  abstract update(
    workspaceId: string,
    categoryId: string,
    changes: { name?: string; position?: number },
  ): Promise<ChannelCategory | undefined>;
  abstract delete(workspaceId: string, categoryId: string): Promise<boolean>;
}
