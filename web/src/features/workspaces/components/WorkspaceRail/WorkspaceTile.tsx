import { NavTile, useIsMobile } from '@ap-education/ui';

import { useWorkspaceChannelAttention } from '@/features/social/read-state/hooks/useWorkspaceChannelAttention';
import { Avatar } from '@/shared/ui/Avatar';

import type { Workspace } from '../../types';

interface WorkspaceTileProps {
  workspace: Workspace;
  active: boolean;
  onSelect: () => void;
}

/** A workspace on the rail: marked while its channels hold something new, counting mentions. */
export function WorkspaceTile({ workspace, active, onSelect }: WorkspaceTileProps) {
  const isMobile = useIsMobile();
  const attention = useWorkspaceChannelAttention(workspace.id);

  return (
    <NavTile
      label={workspace.name}
      active={active}
      unread={attention.unread}
      badge={attention.badge}
      onClick={onSelect}
    >
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
