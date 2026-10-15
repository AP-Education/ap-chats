/** A person as one workspace knows them: a member id means nothing outside its workspace. */
export interface MemberSummary {
  workspaceId: string;
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
}
