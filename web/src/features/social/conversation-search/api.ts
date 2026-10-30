import { apiRequest } from '@/shared/api/http';

import type { ConversationSearchResults } from './types';

export function findConversations(
  token: string,
  workspaceId: string,
  query: string,
  signal: AbortSignal,
) {
  return apiRequest<ConversationSearchResults>(
    `/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`,
    token,
    { signal },
  );
}
