export const workspaceNotificationsKey = (identity: string | undefined, workspaceId: string) =>
  ['notification-settings', identity, workspaceId] as const;

export const channelNotificationsKey = (
  identity: string | undefined,
  workspaceId: string,
  channelId: string,
) => [...workspaceNotificationsKey(identity, workspaceId), channelId] as const;
