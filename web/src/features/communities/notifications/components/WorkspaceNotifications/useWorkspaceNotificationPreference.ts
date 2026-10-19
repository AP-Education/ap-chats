import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { changeWorkspaceNotifications } from '../../api/workspace-notifications-api';
import { useWorkspaceNotifications } from '../../hooks/useWorkspaceNotifications';
import { workspaceNotificationsKey } from '../../queryKeys';
import type { ChangeNotificationSettings, WorkspaceNotifications } from '../../types';
import { preferenceStatus } from '../NotificationsMenu/preference-status';
import type { NotificationPreference } from '../NotificationsMenu/types';

export function useWorkspaceNotificationPreference(workspaceId: string): NotificationPreference {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const query = useWorkspaceNotifications(workspaceId);
  const change = useMutation({
    mutationFn: (command: ChangeNotificationSettings) =>
      changeWorkspaceNotifications(token as string, workspaceId, command),
    onSuccess: (notifications: WorkspaceNotifications) =>
      queryClient.setQueryData(workspaceNotificationsKey(identity, workspaceId), notifications),
  });
  const level = query.data?.settings.level ?? 'default';

  return {
    status: preferenceStatus(query),
    // Left alone, a workspace hears its channels' mentions.
    level: level === 'default' ? 'mentions' : level,
    isMuted: query.data?.settings.isMuted ?? false,
    changing: change.isPending,
    retry: () => void query.refetch(),
    chooseLevel: (next) => change.mutateAsync({ type: 'level', level: next }),
    chooseMute: (duration) => change.mutateAsync({ type: 'mute', duration }),
    unmute: () => change.mutateAsync({ type: 'unmute' }),
  };
}
