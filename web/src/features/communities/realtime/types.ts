export interface ChannelAccessEvent {
  workspaceId: string;
  channelId: string;
}

export interface WorkspaceAccessEvent {
  workspaceId: string;
}

export type CommunityServerToClientEvents = {
  'communities:channel-granted': (event: ChannelAccessEvent) => void;
  'communities:channel-revoked': (event: ChannelAccessEvent) => void;
  'communities:channel-permissions-changed': (event: ChannelAccessEvent) => void;
  'communities:access-changed': (event: WorkspaceAccessEvent) => void;
};
