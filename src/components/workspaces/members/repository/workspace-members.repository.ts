import type { workspaceMembers } from '@/database/drizzle/schema';

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;

export abstract class WorkspaceMembersRepository {
  abstract findAllForWorkspace(workspaceId: string): Promise<WorkspaceMember[]>;
  abstract findForUser(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined>;
  abstract remove(workspaceId: string, userId: string): Promise<void>;
}
