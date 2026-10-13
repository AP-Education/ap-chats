import type { AnnounceAccessChanges } from './types';

/**
 * What depends on people's roles, such as who is in which channel. Roles and workspace membership
 * call it inside the transaction that changed them; communities binds it, so a missing binding
 * fails at startup instead of silently skipping the recalculation.
 */
export abstract class MemberAccessProjection {
  abstract refreshMembers(workspaceId: string, memberIds: string[]): Promise<AnnounceAccessChanges>;
}
