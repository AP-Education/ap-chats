import type { WorkspaceMember } from '../types';

export abstract class WorkspaceMembersRepository {
  abstract findAllForWorkspace(workspaceId: string): Promise<WorkspaceMember[]>;
  abstract findForUser(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined>;
  abstract findById(workspaceId: string, memberId: string): Promise<WorkspaceMember | undefined>;
  abstract remove(workspaceId: string, userId: string): Promise<void>;
}
