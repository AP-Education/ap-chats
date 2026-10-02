import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation/store';

import { getUploadPolicy } from './attachments-api';
import { UploadQueue } from './upload-queue';

export function useAttachments() {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  const [queue] = useState(() => new UploadQueue({ workspaceId, channelId }));
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

  return {
    drafts,
    policy: policy.data,
    policyError: policy.isError,
    reloadPolicy: () => void policy.refetch(),
    ready: drafts.length > 0 && drafts.every((item) => item.status === 'ready'),
    addFiles,
    remove: (key: string) => queue.remove(key),
    retry: (key: string) => queue.retry(key),
    describe: (key: string, text: string) => queue.describe(key, text),
    takeReady: () => queue.takeReady(),
  };
}
