import type { WorkspaceAccessLevel } from '../../access/types';
import type { MemberSummary, RoleBadge, WorkspaceMember } from '../types';

export abstract class WorkspaceMembersRepository {
  abstract findAllForWorkspace(workspaceId: string): Promise<WorkspaceMember[]>;
  /** People the viewer can talk to, by name; bots take no direct messages, so none are here. */
  abstract search(workspaceId: string, viewerId: string, query: string): Promise<MemberSummary[]>;
  abstract findForUser(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined>;
  abstract findById(workspaceId: string, memberId: string): Promise<WorkspaceMember | undefined>;
  abstract findManyByIds(workspaceId: string, memberIds: string[]): Promise<WorkspaceMember[]>;
  /** The roles the person holds, top first. */
  abstract roleBadgesOf(workspaceId: string, memberId: string): Promise<RoleBadge[]>;
  abstract changeAccessLevel(
    workspaceId: string,
    memberId: string,
    accessLevel: WorkspaceAccessLevel,
  ): Promise<WorkspaceMember | undefined>;
  abstract remove(workspaceId: string, userId: string): Promise<void>;
}
