import { useMobileMenu } from '@ap-education/shell-sdk';
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
  const { isOpen: listShown } = useMobileMenu();
  const channelId = getLastConversation(identity, workspaceId, section);

  // While the mobile list is on screen, its section opens on the list rather than a conversation.
  if (channelId && !listShown && new URLSearchParams(search).get('list') !== '1') {
    return <Navigate to={`/${section}/${encodeURIComponent(channelId)}`} replace />;
  }

  return children;
}
