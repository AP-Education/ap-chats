import { useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import { useConversationSending } from '../sending/hooks/useConversationSending';
import { getUploadPolicy } from './attachments-api';

// The files belong to the conversation, so they wait here and keep uploading in another chat.
export function useAttachments() {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  const { uploads } = useConversationSending(workspaceId, channelId);
  const policy = useQuery({
    queryKey: ['chat-upload-policy', identity, workspaceId, channelId],
    queryFn: () => getUploadPolicy(token!, { workspaceId, channelId }),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  });

  return {
    queue: uploads,
    policy: policy.data,
    policyError: policy.isError,
    reloadPolicy: () => void policy.refetch(),
  };
}
