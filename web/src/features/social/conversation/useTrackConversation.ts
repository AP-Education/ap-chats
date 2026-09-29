import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { ApiError } from '@/shared/api/http';

import type { ConversationSection } from './lastConversation';
import { forgetConversation, rememberConversation } from './lastConversation';

interface TrackedConversationQuery {
  data: { id: string } | undefined;
  isError: boolean;
  error: unknown;
}

/**
 * Keeps the last-visited channel/DM in sync with a conversation query: remembers
 * it on a successful load, forgets it and routes back to the list once it reads
 * as gone (403/404) — the one thing channels and DMs both need from their page.
 */
export function useTrackConversation(
  section: ConversationSection,
  workspaceId: string,
  channelId: string | undefined,
  query: TrackedConversationQuery,
  fallbackPath: string,
): boolean {
  const { identity } = useQueryAuth();
  const navigate = useNavigate();
  const unavailable =
    query.isError && query.error instanceof ApiError && [403, 404].includes(query.error.status);

  useEffect(() => {
    if (query.data && !query.isError) {
      rememberConversation(identity, workspaceId, section, query.data.id);
    }
  }, [identity, query.data, query.isError, workspaceId, section]);

  useEffect(() => {
    if (channelId && unavailable && forgetConversation(identity, workspaceId, section, channelId)) {
      navigate(fallbackPath, { replace: true });
    }
  }, [channelId, identity, navigate, unavailable, workspaceId, section, fallbackPath]);

  return unavailable;
}
