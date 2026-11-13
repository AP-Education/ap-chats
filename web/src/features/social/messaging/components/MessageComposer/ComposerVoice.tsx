import { useComposer } from '@ap-education/timeline/composer';
import { message } from 'antd';
import type { ReactNode } from 'react';

import type { UploadFile, UploadScope } from '../../attachments/types';
import type { useAttachments } from '../../attachments/useAttachments';
import type { ComposedMessage } from '../../types';
import { VoiceComposer } from '../../voice/VoiceComposer';

interface ComposerVoiceProps {
  scope: UploadScope;
  attachments: ReturnType<typeof useAttachments>;
  onSend: (message: ComposedMessage, nonce: string) => void;
  children: ReactNode;
}

export function ComposerVoice({ scope, attachments, onSend, children }: ComposerVoiceProps) {
  const composer = useComposer();
  const { queue, policy } = attachments;

  function send(file: UploadFile, durationMs: number) {
    if (!policy) return false;

    const previousKeys = new Set(queue.getSnapshot().map((draft) => draft.key));
    const rejected = queue.add([file], policy);
    if (rejected.length) {
      void message.error('Не вдалося додати голосове повідомлення до чернетки.');
      return false;
    }

    const recording = queue.getSnapshot().find((draft) => !previousKeys.has(draft.key));
    if (!recording) return false;

    const { message: draft, nonce } = composer.compose();
    queue.commit(nonce);
    onSend(
      {
        ...draft,
        blocks: [{ type: 'voice', attachmentId: recording.key, durationMs }],
      },
      nonce,
    );
    composer.clear();
    return true;
  }

  return (
    <VoiceComposer
      scope={scope}
      visible={!composer.canSend}
      disabled={!policy}
      onStart={composer.blur}
      onSend={send}
    >
      {children}
    </VoiceComposer>
  );
}
