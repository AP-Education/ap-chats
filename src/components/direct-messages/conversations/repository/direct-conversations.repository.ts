import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { MemberPair } from '../types';

export abstract class DirectConversationsRepository {
  /** An active member of the workspace, and whether a person or a bot. */
  abstract findActiveMember(
    workspaceId: string,
    memberId: string,
  ): Promise<{ isBot: boolean } | undefined>;

  /** Holds the pair until the transaction ends, so two openings never create two conversations. */
  abstract lockPair(pair: MemberPair): Promise<void>;

  abstract findPair(pair: MemberPair): Promise<string | undefined>;

  abstract createPair(pair: MemberPair, creatorMemberId: string): Promise<string>;

  /** The same two people's conversation in any workspace they share, this one first. */
  abstract findShared(member: WorkspaceMember, targetMemberId: string): Promise<string | undefined>;
}
