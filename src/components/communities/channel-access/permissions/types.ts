import type { Principal, PrincipalKind } from '@/components/workspaces/access';

export const channelCapabilities = ['view', 'post', 'manage'] as const;
export type ChannelCapability = (typeof channelCapabilities)[number];

/** Who sees, who posts and who manages a channel; posting implies seeing, managing implies both. */
export type ChannelPermissions = Record<ChannelCapability, Principal[]>;

export type PrincipalView =
  | { kind: 'everyone' }
  | { kind: 'role'; roleId: string; name: string; color: string | null }
  | { kind: 'member'; memberId: string; displayName: string | null; avatarPath: string | null };

export type ChannelPermissionsView = Record<ChannelCapability, PrincipalView[]>;

/** One grant through which a person reaches a channel. */
export interface AccessSource {
  capability: ChannelCapability;
  principal: PrincipalKind;
  roleId: string | null;
}
