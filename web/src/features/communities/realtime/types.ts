export type CommunityServerToClientEvents = {
  'communities:changed': (event: {
    type: 'communities.channel.created';
    workspaceId: string;
    channelId: string;
  }) => void;
};
