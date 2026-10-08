import {
  Panel,
  PanelBody,
  PanelDivider,
  PanelHeader,
  PanelNav,
  PanelNavItem,
  useIsMobile,
} from '@ap-education/ui';
import { ChatsIcon, ChatTextIcon, HouseIcon, PhoneIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { type ComponentProps, useState } from 'react';
import { useHref, useLocation, useNavigate } from 'react-router-dom';

import { CallHistoryList } from '../../features/calls/components/CallHistoryList/CallHistoryList';
import { ChannelsSidebar } from '../../features/communities/components/ChannelsSidebar';
import { PushSettings } from '../../features/notifications/components/PushSettings';
import { DirectMessageList } from '../../features/social/direct-messages/components/DirectMessageList/DirectMessageList';
import { UnreadDirectMessages } from '../../features/social/direct-messages/components/UnreadDirectMessages/UnreadDirectMessages';
import { WorkspaceHeader } from '../../features/workspaces/components/WorkspaceHeader';
import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { ChannelsNavBadge } from './ChannelsNavBadge';
import { DirectMessagesNavBadge } from './DirectMessagesNavBadge';

type SidebarSection = 'channels' | 'direct' | 'calls';

const useStyles = createStyles(({ css }) => ({
  headerActions: css`
    display: flex;
    flex-shrink: 0;
    padding-right: 8px;
  `,
}));

const sectionItems: {
  section: SidebarSection;
  path?: '/channels' | '/direct';
  icon: typeof HouseIcon;
  label: string;
}[] = [
  { section: 'channels', path: '/channels', icon: ChatsIcon, label: 'Чати' },
  { section: 'direct', path: '/direct', icon: ChatTextIcon, label: 'Особисті' },
  { section: 'calls', icon: PhoneIcon, label: 'Дзвінки' },
];

function isWithin(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function ChatsPanel() {
  const { styles } = useStyles();
  const { pathname, key: locationKey } = useLocation();
  const { workspace } = useActiveWorkspace();
  const isMobile = useIsMobile();
  const [chosen, setChosen] = useState<{
    locationKey: string;
    section: SidebarSection;
  } | null>(null);
  const routeSection =
    sectionItems.find(({ path }) => path && isWithin(pathname, path))?.section ?? null;
  // Calls have no route to reflect them, so picking calls survives navigation until another section is picked.
  const chosenSection =
    chosen && (chosen.section === 'calls' || chosen.locationKey === locationKey)
      ? chosen.section
      : null;
  const activeSection = chosenSection ?? routeSection;
  const listSection = activeSection ?? 'channels';
  const homeActive = !chosenSection && pathname === '/';

  return (
    <Panel>
      <PanelHeader>
        <WorkspaceHeader />
        <div className={styles.headerActions}>
          <PushSettings />
        </div>
      </PanelHeader>
      <PanelNav>
        <RouteNavItem
          to="/"
          icon={HouseIcon}
          label="Головна"
          active={homeActive}
          onNavigate={() => setChosen(null)}
        />
        {sectionItems.map(({ section, path, icon, label }) => {
          const active = activeSection === section;
          const badge = workspace && <NavItemBadge section={section} />;

          if (path && !isMobile) {
            return (
              <RouteNavItem
                key={section}
                to={path}
                icon={icon}
                label={label}
                badge={badge}
                active={active}
                onNavigate={() => setChosen(null)}
              />
            );
          }

          return (
            <PanelNavItem
              key={section}
              icon={icon}
              label={label}
              badge={badge}
              active={active}
              onClick={() => setChosen({ locationKey, section })}
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
          {workspace && (
            <PanelBody hidden={listSection !== 'calls'}>
              <CallHistoryList workspaceId={workspace.id} />
            </PanelBody>
          )}
        </>
      ) : (
        <PanelBody>
          <SectionList section={activeSection} />
        </PanelBody>
      )}
    </Panel>
  );
}

function SectionList({ section }: { section: SidebarSection | null }) {
  const { workspace } = useActiveWorkspace();

  if (workspace && section === 'direct') return <DirectMessageList workspaceId={workspace.id} />;
  if (workspace && section === 'calls') return <CallHistoryList workspaceId={workspace.id} />;
  return <ChannelsSidebar />;
}

type RouteNavItemProps = Omit<ComponentProps<typeof PanelNavItem>, 'href' | 'onClick'> & {
  to: string;
  onNavigate: () => void;
};

/** A navigation item that is a real link: the router adds the base path to `href`. */
function RouteNavItem({ to, onNavigate, ...item }: RouteNavItemProps) {
  const href = useHref(to);
  const navigate = useNavigate();

  return (
    <PanelNavItem
      {...item}
      href={href}
      onClick={() => {
        onNavigate();
        void navigate(to);
      }}
    />
  );
}

function NavItemBadge({ section }: { section: SidebarSection }) {
  if (section === 'channels') return <ChannelsNavBadge />;
  if (section === 'direct') return <DirectMessagesNavBadge />;
  return null;
}
