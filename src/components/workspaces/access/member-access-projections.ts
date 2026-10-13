import { Injectable } from '@nestjs/common';

import type { AnnounceAccessChanges, MemberAccessProjection } from './types';

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
