export const channelKinds = ['public', 'private'] as const;
export type ChannelKind = (typeof channelKinds)[number];

// The wire shape for every channel endpoint (list/get/create/update) —
// backend's internal Channel/ChannelView split doesn't reach the client.
export interface Channel {
  id: string;
  workspaceId: string;
  categoryId: string | null;
  kind: ChannelKind;
  name: string;
  createdByMemberId: string;
  createdAt: string;
  updatedAt: string;
  isMember: boolean;
}

export interface CreateChannelInput {
  name: string;
  kind: ChannelKind;
  categoryId?: string;
}

export interface UpdateChannelInput {
  name?: string;
  categoryId?: string | null;
}
