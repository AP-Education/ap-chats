export const channelKinds = ['public', 'private', 'dm'] as const;
export type ChannelKind = (typeof channelKinds)[number];
