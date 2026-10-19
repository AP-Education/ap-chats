import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import {
  changeChannelNotificationSettings,
  getChannelNotificationSettings,
} from '../../api/channel-notifications-api';
import { channelNotificationsKey } from '../../queryKeys';
import type { ChangeNotificationSettings, NotificationSettings } from '../../types';
import { preferenceStatus } from '../NotificationsMenu/preference-status';
import type { NotificationPreference } from '../NotificationsMenu/types';

export function useChannelNotificationPreference(
  workspaceId: string,
  channelId: string,
): NotificationPreference {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const queryKey = channelNotificationsKey(identity, workspaceId, channelId);
  const query = useQuery({
    queryKey,
    queryFn: () => getChannelNotificationSettings(token as string, workspaceId, channelId),
    enabled: Boolean(token),
  });
  const change = useMutation({
    mutationFn: (command: ChangeNotificationSettings) =>
      changeChannelNotificationSettings(token as string, workspaceId, channelId, command),
    onSuccess: (settings: NotificationSettings) => queryClient.setQueryData(queryKey, settings),
  });

  return {
    status: preferenceStatus(query),
    level: query.data?.level ?? 'default',
    isMuted: query.data?.isMuted ?? false,
    changing: change.isPending,
    retry: () => void query.refetch(),
    chooseLevel: (level) => change.mutateAsync({ type: 'level', level }),
    chooseMute: (duration) => change.mutateAsync({ type: 'mute', duration }),
    unmute: () => change.mutateAsync({ type: 'unmute' }),
  };
}
