export function channelRoom(workspaceId: string, channelId: string): string {
  return `social:workspace:${workspaceId}:channel:${channelId}`;
}
