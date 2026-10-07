/** Where the shell mounts Chats; every Chats URL lives under it. */
export const CHATS_BASE = '/c';

export const paths = {
  home: CHATS_BASE,
  channels: `${CHATS_BASE}/channels`,
  direct: `${CHATS_BASE}/direct`,
  calls: `${CHATS_BASE}/calls`,
  channel: (channelId: string) => `${CHATS_BASE}/channels/${channelId}`,
  directMessage: (channelId: string) => `${CHATS_BASE}/direct/${channelId}`,
  conversation: (section: 'channels' | 'direct', channelId: string) =>
    `${CHATS_BASE}/${section}/${channelId}`,
};
