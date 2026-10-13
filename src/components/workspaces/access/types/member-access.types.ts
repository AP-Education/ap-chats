/** Tells the people a change concerns; it runs once the transaction that made it has committed. */
export type AnnounceAccessChanges = () => void;

/** A resource that keeps its own per-person access list, derived from roles. */
export interface MemberAccessProjection {
  /** Runs inside the transaction that changed the people's roles; announcing waits for its commit. */
  refreshMembers(workspaceId: string, memberIds: string[]): Promise<AnnounceAccessChanges>;
}
