export const channelKinds = ['public', 'private'] as const;
export type ChannelKind = (typeof channelKinds)[number];
