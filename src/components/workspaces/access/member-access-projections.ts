import { Injectable } from '@nestjs/common';

export type AnnounceAccessChanges = () => void;

/** A resource that keeps its own per-person access list, derived from roles. */
export interface MemberAccessProjection {
  /** Runs inside the transaction that changed the people's roles; announcing waits for its commit. */
  refreshMembers(workspaceId: string, memberIds: string[]): Promise<AnnounceAccessChanges>;
}

/** Lets roles stay unaware of which resources depend on them. */
@Injectable()
export class MemberAccessProjections {
  private readonly projections: MemberAccessProjection[] = [];

  register(projection: MemberAccessProjection): void {
    this.projections.push(projection);
  }

  async refreshMembers(workspaceId: string, memberIds: string[]): Promise<AnnounceAccessChanges> {
    const announcements: AnnounceAccessChanges[] = [];
    for (const projection of this.projections)
      announcements.push(await projection.refreshMembers(workspaceId, memberIds));

    return () => announcements.forEach((announce) => announce());
  }
}
