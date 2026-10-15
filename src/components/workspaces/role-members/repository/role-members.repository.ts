import type { MemberSummary } from '../../members/types';

export abstract class RoleMembersRepository {
  /** The active people in the role, by name. */
  abstract holders(workspaceId: string, roleId: string): Promise<MemberSummary[]>;
  /** Resolves to the active people who were not in the role yet. */
  abstract enroll(workspaceId: string, roleId: string, memberIds: string[]): Promise<string[]>;
  abstract release(workspaceId: string, roleId: string, memberId: string): Promise<boolean>;
}
