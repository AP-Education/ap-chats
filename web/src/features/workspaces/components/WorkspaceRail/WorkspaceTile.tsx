import { NavTile, useIsMobile } from '@ap-education/ui';

import { useWorkspaceChannelUnread } from '@/features/social/read-state/hooks/useWorkspaceChannelUnread';
import { Avatar } from '@/shared/ui/Avatar';

import type { Workspace } from '../../types';

interface WorkspaceTileProps {
  workspace: Workspace;
  active: boolean;
  onSelect: () => void;
}

/** A workspace on the rail, with the count of unread messages in its channels. */
export function WorkspaceTile({ workspace, active, onSelect }: WorkspaceTileProps) {
  const isMobile = useIsMobile();
  const unread = useWorkspaceChannelUnread(workspace.id);

  return (
    <NavTile label={workspace.name} active={active} badge={unread} onClick={onSelect}>
      <Avatar
        path={workspace.avatarPath}
        alt={workspace.name}
        size={isMobile ? 44 : 40}
        shape="square"
        lazy={false}
      />
    </NavTile>
  );
}
