import { useWorkspaceUnread } from './hooks/useWorkspaceUnread';

export function WorkspaceUnreadSync({ workspaceId }: { workspaceId: string }) {
  useWorkspaceUnread(workspaceId);
  return null;
}
