import {
  Panel,
  PanelBody,
  PanelDivider,
  PanelHeader,
  PanelNav,
  PanelNavItem,
  useIsMobile,
} from '@ap/ui';
import { ChatsIcon, ChatTextIcon, HouseIcon, PhoneIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { paths } from '@/shared/lib/paths';

import { ChannelsSidebar } from '../../features/communities/components/ChannelsSidebar';
import { DirectMessageList } from '../../features/social/direct-messages/components/DirectMessageList/DirectMessageList';
import { UnreadDirectMessages } from '../../features/social/direct-messages/components/UnreadDirectMessages/UnreadDirectMessages';
import { WorkspaceHeader } from '../../features/workspaces/components/WorkspaceHeader';
import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { ChannelsNavBadge } from './ChannelsNavBadge';
import { DirectMessagesNavBadge } from './DirectMessagesNavBadge';

type ConversationSection = 'channels' | 'direct';

const navItems: {
  to: string;
  section: ConversationSection | null;
  icon: typeof HouseIcon;
  label: string;
}[] = [
  { to: paths.home, section: null, icon: HouseIcon, label: 'Головна' },
  { to: paths.channels, section: 'channels', icon: ChatsIcon, label: 'Чати' },
  { to: paths.direct, section: 'direct', icon: ChatTextIcon, label: 'Особисті' },
  { to: paths.calls, section: null, icon: PhoneIcon, label: 'Дзвінки' },
];

export function ChatsPanel() {
  const { pathname, key: locationKey } = useLocation();
  const navigate = useNavigate();
  const { workspace } = useActiveWorkspace();
  const isMobile = useIsMobile();
  const [selection, setSelection] = useState<{
    locationKey: string;
    section: ConversationSection;
  } | null>(null);
  const routeSection = pathname.startsWith(paths.direct)
    ? 'direct'
    : pathname.startsWith(paths.channels)
      ? 'channels'
      : null;
  const hasSelection = selection?.locationKey === locationKey;
  const activeSection = hasSelection ? selection.section : routeSection;
  const listSection = activeSection ?? 'channels';

  return (
    <Panel>
      <PanelHeader>
        <WorkspaceHeader />
      </PanelHeader>
      <PanelNav>
        {navItems.map(({ to, section, icon, label }) => {
          const routeActive =
            pathname === to || (to !== paths.home && pathname.startsWith(`${to}/`));
          const badge = workspace && <NavItemBadge section={section} />;

          if (isMobile && section) {
            return (
              <PanelNavItem
                key={to}
                icon={icon}
                label={label}
                badge={badge}
                active={activeSection === section}
                onClick={() => setSelection({ locationKey, section })}
              />
            );
          }

          return (
            <PanelNavItem
              key={to}
              icon={icon}
              label={label}
              badge={badge}
              active={isMobile ? !hasSelection && routeActive : routeActive}
              href={to}
              onClick={() => void navigate(to)}
            />
          );
        })}
      </PanelNav>
      {workspace && (!isMobile || listSection === 'channels') && <UnreadDirectMessages />}
      <PanelDivider />
      {isMobile ? (
        <>
          <PanelBody hidden={listSection !== 'channels'}>
            <ChannelsSidebar />
          </PanelBody>
          {workspace && (
            <PanelBody hidden={listSection !== 'direct'}>
              <DirectMessageList workspaceId={workspace.id} />
            </PanelBody>
          )}
        </>
      ) : (
        <PanelBody>
          {pathname.startsWith(paths.direct) && workspace ? (
            <DirectMessageList workspaceId={workspace.id} />
          ) : (
            <ChannelsSidebar />
          )}
        </PanelBody>
      )}
    </Panel>
  );
}

function NavItemBadge({ section }: { section: ConversationSection | null }) {
  if (section === 'channels') return <ChannelsNavBadge />;
  if (section === 'direct') return <DirectMessagesNavBadge />;
  return null;
}
