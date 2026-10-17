import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { useSyncExternalStore } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import { useConversationSending } from '../sending/outboxes-context';
import { getUploadPolicy } from './attachments-api';

/** The composer's files. They belong to the conversation rather than its screen, so they wait
 * for the viewer in this chat, and keep uploading, while another chat is open. */
export function useAttachments() {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  const { uploads } = useConversationSending(workspaceId, channelId);
  const drafts = useSyncExternalStore(uploads.subscribe, uploads.getSnapshot);
  const policy = useQuery({
    queryKey: ['chat-upload-policy', identity, workspaceId, channelId],
    queryFn: () => getUploadPolicy(token!, { workspaceId, channelId }),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  });

  function addFiles(files: File[]) {
    if (!policy.data) {
      void message.error('Не вдалося отримати ліміти файлів. Спробуйте ще раз.');
      return;
    }
    for (const error of uploads.add(files, policy.data)) void message.error(error);
  }

  return {
    drafts,
    policy: policy.data,
    policyError: policy.isError,
    reloadPolicy: () => void policy.refetch(),
    addFiles,
    remove: (key: string) => uploads.remove(key),
    retry: (key: string) => uploads.retry(key),
    describe: (key: string, text: string) => uploads.describe(key, text),
    // Sending never waits on uploads: this hands the current files to the message under
    // `nonce`, and they keep uploading for it in the background.
    commit: (nonce: string) => uploads.commit(nonce),
  };
}
