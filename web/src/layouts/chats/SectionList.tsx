import { CallHistoryList } from '@/features/calls/components/CallHistoryList/CallHistoryList';
import { ClientList } from '@/features/clients/components/ClientList';
import { ChannelsSidebar } from '@/features/communities/components/ChannelsSidebar';
import { DirectMessageList } from '@/features/social/direct-messages/components/DirectMessageList/DirectMessageList';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';

import type { ChatsSection } from './sections';

export function SectionList({ section }: { section: ChatsSection }) {
  const { workspace } = useActiveWorkspace();

  if (section === 'clients') return <ClientList />;

  if (workspace && section === 'direct') return <DirectMessageList workspaceId={workspace.id} />;
  if (workspace && section === 'calls') return <CallHistoryList />;
  return <ChannelsSidebar />;
}
