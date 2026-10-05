import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation/store';

import { getUploadPolicy } from './attachments-api';
import type { AttachmentDraft } from './types';
import { UploadQueue } from './upload-queue';

export function useAttachments() {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  // Recreated per channel rather than reused across a scope change: an
  // in-flight upload is bound to the channel it started in, so a stale queue
  // can't be allowed to keep targeting it after the composer switches away.
  const queue = useMemo(
    () => new UploadQueue({ workspaceId, channelId }),
    [workspaceId, channelId],
  );
  const drafts = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  const policy = useQuery({
    queryKey: ['chat-upload-policy', identity, workspaceId, channelId],
    queryFn: () => getUploadPolicy(token!, { workspaceId, channelId }),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    queue.setToken(token);
  }, [queue, token]);
  useEffect(() => {
    queue.activate();
    return () => queue.dispose();
  }, [queue]);

  function addFiles(files: File[]) {
    if (!policy.data) {
      void message.error('Не вдалося отримати ліміти файлів. Спробуйте ще раз.');
      return;
    }
    for (const error of queue.add(files, policy.data)) void message.error(error);
  }

  /**
   * Live-watches a commit's drafts until the caller stops listening (returns
   * the unsubscribe). The first check is deferred to a microtask rather than
   * run inline: a caller naturally writes `const unsubscribe = watchCommitted(
   * ...)`, and if the drafts are already ready (nothing left to wait for),
   * the callback calling `unsubscribe()` synchronously, before that
   * assignment has even completed, would hit it mid-initialization.
   */
  function watchCommitted(
    clientNonce: string,
    onUpdate: (drafts: AttachmentDraft[]) => void,
  ): () => void {
    const check = () => onUpdate(queue.getCommitted(clientNonce));
    const unsubscribe = queue.subscribe(check);
    queueMicrotask(check);
    return unsubscribe;
  }

  return {
    drafts,
    policy: policy.data,
    policyError: policy.isError,
    reloadPolicy: () => void policy.refetch(),
    addFiles,
    remove: (key: string) => queue.remove(key),
    retry: (key: string) => queue.retry(key),
    describe: (key: string, text: string) => queue.describe(key, text),
    // Sending never waits on upload completion, so this just detaches the
    // current drafts from the composer (the returned snapshot is whatever
    // state they're already in) while they keep uploading in the background.
    commit: (clientNonce: string) => queue.commit(clientNonce),
    watchCommitted,
    uncommit: (clientNonce: string) => queue.uncommit(clientNonce),
    releaseCommitted: (clientNonce: string) => queue.releaseCommitted(clientNonce),
  };
}
