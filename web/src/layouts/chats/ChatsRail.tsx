import { type AppTab, useIsAppActive, useOpenApp } from '@ap-education/shell-sdk';
import { NavTile } from '@ap-education/ui';
import { createStyles } from 'antd-style';
import { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { type Attention, QUIET } from '../../features/social/read-state/conversation-attention';
import { WorkspaceUnreadContext } from '../../features/social/read-state/workspace-unread-context';
import { WorkspaceRail } from '../../features/workspaces/components/WorkspaceRail';
import { personalTab, sectionAt } from './sections';

const useStyles = createStyles(({ token, css }) => ({
  divider: css`
    flex-shrink: 0;
    width: 28px;
    height: 2px;
    border-radius: 1px;
    background: ${token.colorBorderSecondary};
  `,
}));

/** Chats on the shell rail: the person's direct messages, then the team workspaces. */
export function ChatsRail() {
  const { styles } = useStyles();
  const { pathname } = useLocation();
  const direct = useContext(WorkspaceUnreadContext)?.direct ?? QUIET;
  const onTeam = sectionAt(pathname) === 'channels';

  return (
    <>
      <SectionTile tab={personalTab} pathname={pathname} attention={direct} />
      {/* Technical debt: calls have no desktop tile until the stakeholder settles where they
          belong there; /calls still opens from links and the mobile tab. */}
      <div className={styles.divider} role="separator" />
      <WorkspaceRail onTeam={onTeam} />
    </>
  );
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
