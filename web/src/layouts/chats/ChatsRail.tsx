import { type AppTab, useIsAppActive, useOpenApp } from '@ap-education/shell-sdk';
import { NavTile } from '@ap-education/ui';
import { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { type Attention, QUIET } from '../../features/social/read-state/conversation-attention';
import { WorkspaceUnreadContext } from '../../features/social/read-state/workspace-unread-context';
import { WorkspaceRail } from '../../features/workspaces/components/WorkspaceRail';
import { personalTab, sectionAt } from './sections';

/** Chats at its place on the shell rail: the person's direct messages. */
export function ChatsRail() {
  const { pathname } = useLocation();
  const direct = useContext(WorkspaceUnreadContext)?.direct ?? QUIET;

  // Technical debt: calls have no desktop tile until the stakeholder settles where they
  // belong there; /calls still opens from links and the mobile tab.
  return <SectionTile tab={personalTab} pathname={pathname} attention={direct} />;
}

/**
 * The team workspaces at the end of the shell rail, only while Chats is open, so they do not
 * crowd the rail of every other application.
 */
export function ChatsRailEnd() {
  const { pathname } = useLocation();
  const chatsActive = useIsAppActive();
  if (!chatsActive) return null;
  return <WorkspaceRail onTeam={sectionAt(pathname) === 'channels'} />;
}

function SectionTile({
  tab,
  pathname,
  attention,
}: {
  tab: AppTab;
  pathname: string;
  attention: Attention;
}) {
  const chatsActive = useIsAppActive();
  const openApp = useOpenApp();
  const navigate = useNavigate();
  const active = chatsActive && tab.includes(pathname);

  function open() {
    if (chatsActive) void navigate(tab.path);
    else openApp('chats', tab.path);
  }

  return (
    <NavTile
      label={tab.label}
      active={active}
      unread={attention.unread}
      badge={attention.badge}
      onClick={open}
    >
      <tab.icon size={22} weight={active ? 'fill' : 'regular'} />
    </NavTile>
  );
}
