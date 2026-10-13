import { type PropsWithChildren, useMemo } from 'react';

import { useOverlay } from '@/shared/lib/overlay';

import { ChannelSettingsModal } from '../components/ChannelSettingsModal/ChannelSettingsModal';
import { CreateChannelModal } from '../components/CreateChannelModal/CreateChannelModal';
import {
  type ChannelDialog,
  type ChannelDialogs,
  ChannelDialogsContext,
} from '../stores/channel-dialogs-context';

// One dialog for every place that opens it, mounted above the sidebar rows so its touches,
// context menus and drags never reach their gestures.
export function ChannelDialogsProvider({ children }: PropsWithChildren) {
  const { item: dialog, open, showing, show, close } = useOverlay<ChannelDialog>();

  const dialogs = useMemo<ChannelDialogs>(
    () => ({
      create: (place) => show({ kind: 'create', place }),
      openSettings: (workspaceId, channelId) => show({ kind: 'settings', workspaceId, channelId }),
    }),
    [show],
  );

  return (
    <ChannelDialogsContext.Provider value={dialogs}>
      {children}
      {dialog?.kind === 'create' && (
        <CreateChannelModal key={showing} place={dialog.place} open={open} onClose={close} />
      )}
      {dialog?.kind === 'settings' && (
        <ChannelSettingsModal
          key={showing}
          workspaceId={dialog.workspaceId}
          channelId={dialog.channelId}
          open={open}
          onClose={close}
        />
      )}
    </ChannelDialogsContext.Provider>
  );
}
