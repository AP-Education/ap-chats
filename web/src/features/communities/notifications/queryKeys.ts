export const notificationSettingsKey = (identity: string | undefined) =>
  ['notification-settings', identity] as const;

export const workspaceNotificationsKey = (identity: string | undefined, workspaceId: string) =>
  [...notificationSettingsKey(identity), workspaceId] as const;

export const channelNotificationsKey = (
  identity: string | undefined,
  workspaceId: string,
  channelId: string,
) => [...workspaceNotificationsKey(identity, workspaceId), channelId] as const;
