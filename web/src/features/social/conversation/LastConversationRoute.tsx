import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useRequiredWorkspace } from '@/features/workspaces/stores/required-workspace-context';

import { type ConversationSection, getLastConversation } from './lastConversation';

export function LastConversationRoute({
  section,
  children,
}: {
  section: ConversationSection;
  children: ReactNode;
}) {
  const { identity } = useQueryAuth();
  const { id: workspaceId } = useRequiredWorkspace();
  const { search } = useLocation();
  const channelId = getLastConversation(identity, workspaceId, section);

  if (channelId && new URLSearchParams(search).get('list') !== '1') {
    return <Navigate to={`/${section}/${encodeURIComponent(channelId)}`} replace />;
  }

  return children;
}
