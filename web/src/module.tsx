import { defineApp } from '@ap-education/shell-sdk';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

import { ChatsProviders } from './app/ChatsProviders';
import { WorkspaceStartup } from './app/WorkspaceStartup';
import { CallSurface } from './features/calls/components/CallSurface';
import { ConnectionBanner } from './features/realtime/components/ConnectionBanner';
import { ChatBackdrop } from './features/social/wallpaper/components/ChatBackdrop';
import { WallpaperSettings } from './features/social/wallpaper/components/WallpaperSettings';
import { ChatsContent } from './layouts/chats/ChatsContent';
import { ChatsPanel } from './layouts/chats/ChatsPanel';
import { ChatsRail } from './layouts/chats/ChatsRail';
import { callsTab, personalTab, teamTab } from './layouts/chats/sections';

function Startup() {
  const { t } = useTranslation('navigation');

  return (
    <div role="status" aria-label={t(($) => $.loadingChats)} style={{ padding: 16 }}>
      <Skeleton active paragraph={{ rows: 6 }} />
    </div>
  );
}

function Panel() {
  return (
    <WorkspaceStartup fallback={<Startup />}>
      <ChatsPanel />
    </WorkspaceStartup>
  );
}

function Content() {
  return (
    <WorkspaceStartup fallback={<Startup />}>
      <ChatsContent />
    </WorkspaceStartup>
  );
}

export default defineApp({
  Providers: ChatsProviders,
  Panel,
  Rail: ChatsRail,
  Ongoing: CallSurface,
  Banner: ConnectionBanner,
  Content,
  Backdrop: ChatBackdrop,
  AppearanceSection: WallpaperSettings,
  // On mobile the lists are the navigation itself.
  opensMobileMenuAt: (path) => path === '/channels' || path === '/direct' || path === '/calls',
  tabs: [teamTab, personalTab, callsTab],
});
