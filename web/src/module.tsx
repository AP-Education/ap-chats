import { defineApp } from '@ap-education/shell-sdk';
import { Skeleton } from 'antd';

import { ChatsProviders } from './app/ChatsProviders';
import { WorkspaceStartup } from './app/WorkspaceStartup';
import { CallSurface } from './features/calls/components/CallSurface';
import { ConnectionBanner } from './features/realtime/components/ConnectionBanner';
import { WorkspaceRail } from './features/workspaces/components/WorkspaceRail';
import { ChatsContent } from './layouts/chats/ChatsContent';
import { ChatsPanel } from './layouts/chats/ChatsPanel';

const startup = (
  <div role="status" aria-label="Завантажуємо чати" style={{ padding: 16 }}>
    <Skeleton active paragraph={{ rows: 6 }} />
  </div>
);

function Panel() {
  return (
    <WorkspaceStartup fallback={startup}>
      <ChatsPanel />
    </WorkspaceStartup>
  );
}

function Content() {
  return (
    <WorkspaceStartup fallback={startup}>
      <ChatsContent />
    </WorkspaceStartup>
  );
}

export default defineApp({
  Providers: ChatsProviders,
  Panel,
  Rail: WorkspaceRail,
  Ongoing: CallSurface,
  Banner: ConnectionBanner,
  Content,
  // On mobile the channel and direct lists are the navigation itself.
  opensMobileMenuAt: (path) => path === '/channels' || path === '/direct',
});
