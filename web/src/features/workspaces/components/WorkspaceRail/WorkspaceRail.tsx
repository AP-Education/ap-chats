import { useIsAppActive, useOpenApp } from '@ap-education/shell-sdk';
import { NavAddTile, NavTile } from '@ap-education/ui';
import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { Skeleton } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useActiveWorkspace } from '../../hooks/useActiveWorkspace';
import { WorkspaceFormModal } from '../WorkspaceFormModal';
import { WorkspaceTile } from './WorkspaceTile';

interface WorkspaceRailProps {
  /** Whether the page is the team's; from direct messages or calls a workspace leads to its channels. */
  onTeam: boolean;
}

// Workspace tiles the Chats application adds to the shell rail. A workspace can be picked
// from any application: Chats opens where it was left, or at its start for a new workspace.
export function WorkspaceRail({ onTeam }: WorkspaceRailProps) {
  const { workspace, workspaces, isLoading, isError, retry, selectWorkspace } =
    useActiveWorkspace();
  const chatsActive = useIsAppActive();
  const openApp = useOpenApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [creating, setCreating] = useState(false);

  function handleSelect(workspaceId: string) {
    const changed = workspaceId !== workspace?.id;
    if (changed) selectWorkspace(workspaceId);

    if (!onTeam) {
      if (chatsActive) void navigate('/channels');
      else openApp('chats', '/channels');
      return;
    }
    if (!chatsActive) {
      openApp('chats', changed ? '/' : undefined);
      return;
    }
    if (changed && pathname.startsWith('/channels/')) void navigate('/channels');
  }

  if (isLoading) {
    return (
      <>
        <Skeleton.Avatar active shape="square" size={44} />
        <Skeleton.Avatar active shape="square" size={44} />
      </>
    );
  }

  if (isError && !workspaces) {
    return (
      <NavTile label="Повторити завантаження робочих просторів" onClick={retry}>
        <ArrowClockwiseIcon size={22} />
      </NavTile>
    );
  }

  return (
    <>
      {(workspaces ?? []).map((item) => (
        <WorkspaceTile
          key={item.id}
          workspace={item}
          active={chatsActive && onTeam && item.id === workspace?.id}
          onSelect={() => handleSelect(item.id)}
        />
      ))}
      <NavAddTile label="Створити робочий простір" onClick={() => setCreating(true)} />
      <WorkspaceFormModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
