import { message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChannelPermissions } from '../../channel-access/hooks/useChannelPermissions';
import type { ChannelPermissions, ChannelPermissionsInput } from '../../channel-access/types';
import { isChannelNameTaken } from '../channel-name';
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
  const { t } = useTranslation('communities');
  const channel = useChannel(workspaceId, channelId).data;
  const permissions = useChannelPermissions(workspaceId, channelId);
  const { update, remove } = useChannelActions(workspaceId);
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
        setNameError(t(($) => $.channels.name.taken));
        return;
      }
      void message.error(t(($) => $.channels.saveFailed));
    }
  }

  // An open page of the channel finds it gone on its own; deleting it only closes the dialog.
  async function deleteChannel() {
    try {
      await remove.mutateAsync(channelId);
      onDone();
    } catch {
      void message.error(t(($) => $.channels.deleteFailed));
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
