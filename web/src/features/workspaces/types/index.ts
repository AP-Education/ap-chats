export interface Workspace {
  id: string;
  name: string;
  avatarPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  avatarPath?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  avatarPath?: string;
}

export interface UploadedFile {
  path: string;
  url: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'member';
  status: 'active' | 'removed';
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
}
