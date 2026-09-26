export interface ChannelCategory {
  id: string;
  workspaceId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelCategoryInput {
  name: string;
  position?: number;
}

export interface UpdateChannelCategoryInput {
  name?: string;
  position?: number;
}
