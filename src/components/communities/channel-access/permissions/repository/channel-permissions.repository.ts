import type { ChannelPermissions, ChannelPermissionsView } from '../types';

export abstract class ChannelPermissionsRepository {
  abstract describe(workspaceId: string, channelId: string): Promise<ChannelPermissionsView>;
  abstract replace(
    workspaceId: string,
    channelId: string,
    permissions: ChannelPermissions,
  ): Promise<void>;
}
