import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import {
  changeChannelNotificationSettings,
  getChannelNotificationSettings,
} from '../../api/channel-notifications-api';
import type {
  ChangeNotificationSettings,
  ChannelNotificationSettings,
  NotificationLevel,
} from '../../types';

export function useChannelNotificationPreference(workspaceId: string, channelId: string) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const queryKey = ['notification-settings', identity, workspaceId, channelId] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => getChannelNotificationSettings(token as string, workspaceId, channelId),
    enabled: Boolean(token),
  });
  const change = useMutation({
    mutationFn: (command: ChangeNotificationSettings) =>
      changeChannelNotificationSettings(token as string, workspaceId, channelId, command),
    onSuccess: (settings: ChannelNotificationSettings) =>
      queryClient.setQueryData(queryKey, settings),
  });

  return {
    level: query.data?.level ?? 'default',
    isMuted: query.data?.isMuted ?? false,
    isLoading: query.isPending,
    isError: query.isError,
    isPending: change.isPending,
    retry: query.refetch,
    chooseLevel: (level: NotificationLevel) => change.mutateAsync({ type: 'level', level }),
    chooseMute: (milliseconds: number) =>
      change.mutateAsync({ type: 'mute', duration: milliseconds <= 3_600_000 ? 'hour' : 'day' }),
    unmute: () => change.mutateAsync({ type: 'unmute' }),
  };
}
