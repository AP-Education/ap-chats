import type { ChannelPermissionsInput } from '../../channel-access/types';

// The wire shape for every channel endpoint (list/get/create/update).
export interface Channel {
  id: string;
  workspaceId: string;
  categoryId: string | null;
  kind: 'channel';
  name: string;
  createdByMemberId: string;
  createdAt: string;
  updatedAt: string;
  /** The whole workspace sees it. */
  isOpen: boolean;
  /** It is in the person's lists; only workspace managers see channels where it is not. */
  isMember: boolean;
  canPost: boolean;
  /** Includes workspace managers, who manage every channel. */
  canManage: boolean;
}

export interface CreateChannelInput {
  name: string;
  categoryId?: string;
  permissions: ChannelPermissionsInput;
}

export interface UpdateChannelInput {
  name?: string;
  categoryId?: string | null;
}
