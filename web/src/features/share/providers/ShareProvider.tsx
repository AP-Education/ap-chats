import {
  isNativeShell,
  onNativeMessage,
  postToNative,
  useCurrentUser,
} from '@ap-education/shell-sdk';
import { type PropsWithChildren, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { seedComposer } from '@/features/social/messaging/composer-seed';
import { useActiveWorkspaceId } from '@/features/workspaces/stores/active-workspace-context';
import { useOverlay } from '@/shared/lib/overlay';

import { sharedUploadFile } from '../api/shared-upload-file';
import { SharePicker } from '../components/SharePicker/SharePicker';
import { type ShareTarget, targetPath } from '../share-targets';
import type { SharedContent, ShareFromNativeMessage, ShareToNativeMessage } from '../types';

/** Takes what another app shared into this one and sends it to the conversation the person picks. */
export function ShareProvider({ children }: PropsWithChildren) {
  const user = useCurrentUser();
  const signedIn = user.status === 'signed-in';
  const navigate = useNavigate();
  const { setActiveWorkspaceId } = useActiveWorkspaceId();
  const { item: content, open, show, close } = useOverlay<SharedContent>();

  useEffect(() => {
    if (!signedIn || !isNativeShell()) return;

    const stopListening = onNativeMessage<ShareFromNativeMessage>((message) => {
      if (message.type !== 'share/received') return;

      show(message.payload);
      tellNative({ type: 'share/taken', shareId: message.payload.id });
    });
    // The shell holds a share until this page can take it.
    tellNative({ type: 'share/ready' });

    return stopListening;
  }, [signedIn, show]);

  function send(target: ShareTarget) {
    if (!content) return;

    seedComposer(target.channelId, {
      text: content.text ?? '',
      files: content.files.map(sharedUploadFile),
    });
    if (target.kind === 'channel') setActiveWorkspaceId(target.workspaceId);
    void navigate(targetPath(target));
    close();
  }

  return (
    <>
      {children}
      {content && <SharePicker open={open} onPick={send} onClose={close} />}
    </>
  );
}

function tellNative(message: ShareToNativeMessage): void {
  postToNative(message);
}
