import { useIsAppActive, useOpenApp } from '@ap/shell-sdk';
import { NavAddTile, NavTile } from '@ap/ui';
import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { Skeleton } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { paths } from '@/shared/lib/paths';
import { Avatar } from '@/shared/ui/Avatar';

import { useActiveWorkspace } from '../../hooks/useActiveWorkspace';
import { WorkspaceFormModal } from '../WorkspaceFormModal';

// Workspace tiles the Chats application adds to the shell rail. A workspace can be picked
// from any application: Chats opens where it was left, or at its start for a new workspace.
export function WorkspaceRail() {
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

    if (!chatsActive) {
      openApp('chats', changed ? paths.home : undefined);
      return;
    }
    if (!changed) return;
    if (pathname.startsWith(`${paths.channels}/`)) void navigate(paths.channels);
    if (pathname.startsWith(`${paths.direct}/`)) void navigate(paths.direct);
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
        <NavTile
          key={item.id}
          label={item.name}
          active={chatsActive && item.id === workspace?.id}
          onClick={() => handleSelect(item.id)}
        >
          <Avatar path={item.avatarPath} alt={item.name} size={40} shape="square" lazy={false} />
        </NavTile>
      ))}
      <NavAddTile label="Створити робочий простір" onClick={() => setCreating(true)} />
      <WorkspaceFormModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
