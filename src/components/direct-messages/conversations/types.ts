/** Two members of one workspace, in a stable order so each pair has one spelling. */
export interface MemberPair {
  workspaceId: string;
  firstMemberId: string;
  secondMemberId: string;
}

export type MuteMode = 'unmute' | 'hour' | 'day' | 'indefinite';
