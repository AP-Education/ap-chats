/** A person named in a message, as history returns them for their tag. */
export interface MentionLabel {
  memberId: string;
  displayName: string | null;
  avatarPath?: string | null;
  isBot?: boolean;
}
