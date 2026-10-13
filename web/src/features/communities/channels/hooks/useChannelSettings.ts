import { message } from 'antd';
import { useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { forgetConversation } from '@/features/social/conversation/lastConversation';

import { useChannelPermissions } from '../../channel-access/hooks/useChannelPermissions';
import type { ChannelPermissions, ChannelPermissionsInput } from '../../channel-access/types';
import { isChannelNameTaken, takenChannelName } from '../channel-name';
import type { Channel } from '../types';
import { useChannelActions } from './useChannelActions';
import { useChannel } from './useChannels';

export interface ChannelSettingsValues {
  name: string;
  categoryId?: string;
  permissions: ChannelPermissionsInput;
}

/** Which parts of the settings the person changed; untouched parts are not sent. */
export interface EditedSettings {
  details: boolean;
  access: boolean;
}

/** The channel and its current lists, the two things its settings start from. */
export interface LoadedChannelSettings {
  channel: Channel;
  permissions: ChannelPermissions;
}

export interface ChannelSettings {
  /** Absent until both have loaded. */
  loaded: LoadedChannelSettings | undefined;
  nameError: string | undefined;
  clearNameError: () => void;
  isSaving: boolean;
  isDeleting: boolean;
  save: (values: ChannelSettingsValues, edited: EditedSettings) => Promise<void>;
  deleteChannel: () => Promise<void>;
}

/** Saving and deleting one channel from its settings; `onDone` closes them once that succeeds. */
export function useChannelSettings(
  workspaceId: string,
  channelId: string,
  onDone: () => void,
): ChannelSettings {
  const channel = useChannel(workspaceId, channelId).data;
  const permissions = useChannelPermissions(workspaceId, channelId);
  const { update, remove } = useChannelActions(workspaceId);
  const { identity } = useQueryAuth();
  const navigate = useNavigate();
  // Opened from the sidebar too, which sits outside the route tree, so read the URL.
  const routedChannelId = useMatch('/channels/:channelId')?.params.channelId;
  const [nameError, setNameError] = useState<string>();

  async function save(values: ChannelSettingsValues, edited: EditedSettings) {
    setNameError(undefined);
    try {
      if (edited.details)
        await update.mutateAsync({
          channelId,
          input: { name: values.name.trim(), categoryId: values.categoryId ?? null },
        });
      if (edited.access) await permissions.change.mutateAsync(values.permissions);
      onDone();
    } catch (error) {
      if (isChannelNameTaken(error)) {
        setNameError(takenChannelName);
        return;
      }
      void message.error('Не вдалося зберегти канал.');
    }
  }

  async function deleteChannel() {
    const isOnScreen = routedChannelId === channelId;
    if (isOnScreen) {
      // The channels list reopens the last channel, which must not be this one any more.
      forgetConversation(identity, workspaceId, 'channels', channelId);
      navigate('/channels', { replace: true });
    }
    try {
      await remove.mutateAsync(channelId);
      onDone();
    } catch {
      void message.error('Не вдалося видалити канал.');
    }
  }

  const currentLists = permissions.query.data;

  return {
    loaded: channel && currentLists && { channel, permissions: currentLists },
    nameError,
    clearNameError: () => setNameError(undefined),
    isSaving: update.isPending || permissions.change.isPending,
    isDeleting: remove.isPending,
    save,
    deleteChannel,
  };
}
