import type { AccessSource, ChannelPermissions, ChannelPermissionsView } from '../types';

export abstract class ChannelPermissionsRepository {
  abstract describe(workspaceId: string, channelId: string): Promise<ChannelPermissionsView>;
  abstract replace(
    workspaceId: string,
    channelId: string,
    permissions: ChannelPermissions,
  ): Promise<void>;
  abstract sourcesOf(channelId: string, memberId: string): Promise<AccessSource[]>;
  abstract revokePersonal(workspaceId: string, channelId: string, memberId: string): Promise<void>;
}
