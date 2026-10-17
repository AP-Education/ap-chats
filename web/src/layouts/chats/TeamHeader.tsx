import { PanelHeader } from '@ap-education/ui';
import { BellIcon, FoldersIcon, UsersThreeIcon } from '@phosphor-icons/react';
import type { MenuProps } from 'antd';
import { useState } from 'react';

import { ChannelCategoriesModal } from '../../features/communities/channel-categories/components/ChannelCategoriesModal';
import { WorkspaceNotificationsDialog } from '../../features/communities/notifications/components/WorkspaceNotifications/WorkspaceNotificationsDialog';
import { PushSettings } from '../../features/notifications/components/PushSettings';
import { RolesModal } from '../../features/roles/components/RolesModal';
import { UnreadDirectMessages } from '../../features/social/direct-messages/components/UnreadDirectMessages/UnreadDirectMessages';
import { WorkspaceHeader } from '../../features/workspaces/components/WorkspaceHeader';
import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { useWorkspaceMemberLabels } from '../../features/workspaces/hooks/useWorkspaceMemberLabels';
import { isWorkspaceAdministrator } from '../../features/workspaces/workspace-access';
import { PanelHeaderActions } from '../../shared/ui/PanelHeaderActions';

type Managing = 'notifications' | 'roles' | 'categories' | null;

/**
 * The team's name with the workspace's menu: everyone chooses what it tells them about, and
 * managers also shape its roles and categories.
 */
export function TeamHeader() {
  const { workspace } = useActiveWorkspace();
  const { currentMember } = useWorkspaceMemberLabels(workspace?.id);
  const [managing, setManaging] = useState<Managing>(null);

  const isAdministrator = isWorkspaceAdministrator(currentMember);
  const notifications: NonNullable<MenuProps['items']> = [
    {
      key: 'notifications',
      icon: <BellIcon size={18} />,
      label: 'Сповіщення',
      onClick: () => setManaging('notifications'),
    },
  ];
  const administration: NonNullable<MenuProps['items']> = isAdministrator
    ? [
        {
          key: 'roles',
          icon: <UsersThreeIcon size={18} />,
          label: 'Керувати ролями',
          onClick: () => setManaging('roles'),
        },
        {
          key: 'categories',
          icon: <FoldersIcon size={18} />,
          label: 'Керувати категоріями',
          onClick: () => setManaging('categories'),
        },
      ]
    : [];
  const close = () => setManaging(null);

  return (
    <>
      <PanelHeader>
        <WorkspaceHeader actions={[...notifications, ...administration]} />
        <PanelHeaderActions>
          <PushSettings />
        </PanelHeaderActions>
      </PanelHeader>
      {workspace && <UnreadDirectMessages />}
      {workspace && (
        <WorkspaceNotificationsDialog
          key={`notifications-${workspace.id}`}
          workspaceId={workspace.id}
          open={managing === 'notifications'}
          onClose={close}
        />
      )}
      {workspace && isAdministrator && (
        <>
          <RolesModal
            key={`roles-${workspace.id}`}
            workspaceId={workspace.id}
            open={managing === 'roles'}
            onClose={close}
          />
          <ChannelCategoriesModal
            key={`categories-${workspace.id}`}
            workspaceId={workspace.id}
            open={managing === 'categories'}
            onClose={close}
          />
        </>
      )}
    </>
  );
}
