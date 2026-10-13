/** A named group of people; it gives no rights by itself, only where a channel lists it. */
export interface Role {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
  /** Display order, top first; it never decides what anyone may do. */
  position: number;
  /** Its people are listed as their own group among a channel's members. */
  isHoisted: boolean;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}
