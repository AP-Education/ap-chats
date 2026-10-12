export const channelKinds = ['channel', 'dm'] as const;
export type ChannelKind = (typeof channelKinds)[number];
