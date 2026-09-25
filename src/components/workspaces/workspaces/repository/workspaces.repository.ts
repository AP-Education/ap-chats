import type { workspaces } from '@/database/drizzle/schema';

import type { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import type { UpdateWorkspaceDto } from '../dto/update-workspace.dto';

export type Workspace = typeof workspaces.$inferSelect;

export abstract class WorkspacesRepository {
  abstract create(ownerId: string, dto: CreateWorkspaceDto): Promise<Workspace>;
  abstract findAllForMember(userId: string): Promise<Workspace[]>;
  abstract findById(id: string): Promise<Workspace | undefined>;
  abstract update(id: string, dto: UpdateWorkspaceDto): Promise<Workspace>;
  abstract delete(id: string): Promise<void>;
}
