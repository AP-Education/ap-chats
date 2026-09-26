export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'member';
  status: 'active' | 'removed';
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
