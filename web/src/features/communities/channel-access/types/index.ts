export const channelCapabilities = ['view', 'post', 'manage'] as const;
export type ChannelCapability = (typeof channelCapabilities)[number];

/** Whom a channel permission is given to. */
export type Principal =
  { kind: 'everyone' } | { kind: 'role'; roleId: string } | { kind: 'member'; memberId: string };

export type PrincipalView =
  | { kind: 'everyone' }
  | { kind: 'role'; roleId: string; name: string; color: string | null }
  | { kind: 'member'; memberId: string; displayName: string | null; avatarPath: string | null };

/** Who sees, who posts and who manages; managing implies posting, posting implies seeing. */
export type ChannelPermissionsInput = Record<ChannelCapability, Principal[]>;

export type ChannelPermissions = Record<ChannelCapability, PrincipalView[]>;
