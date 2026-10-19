import { PanelHeader } from '@ap-education/ui';
import { FoldersIcon, UsersThreeIcon } from '@phosphor-icons/react';
import type { MenuProps } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChannelCategoriesModal } from '../../features/communities/channel-categories/components/ChannelCategoriesModal';
import { PushSettings } from '../../features/notifications/components/PushSettings';
import { RolesModal } from '../../features/roles/components/RolesModal';
import { UnreadDirectMessages } from '../../features/social/direct-messages/components/UnreadDirectMessages/UnreadDirectMessages';
import { WorkspaceHeader } from '../../features/workspaces/components/WorkspaceHeader';
import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { useWorkspaceMemberLabels } from '../../features/workspaces/hooks/useWorkspaceMemberLabels';
import { isWorkspaceAdministrator } from '../../features/workspaces/workspace-access';
import { PanelHeaderActions } from '../../shared/ui/PanelHeaderActions';

type Managing = 'roles' | 'categories' | null;

/** The team's name with the workspace's menu, where managers also shape its roles and categories. */
export function TeamHeader() {
  const { t } = useTranslation('navigation');
  const { workspace } = useActiveWorkspace();
  const { currentMember } = useWorkspaceMemberLabels(workspace?.id);
  const [managing, setManaging] = useState<Managing>(null);

  const isAdministrator = isWorkspaceAdministrator(currentMember);
  const administration: NonNullable<MenuProps['items']> = isAdministrator
    ? [
        {
          key: 'roles',
          icon: <UsersThreeIcon size={18} />,
          label: t(($) => $.manageRoles),
          onClick: () => setManaging('roles'),
        },
        {
          key: 'categories',
          icon: <FoldersIcon size={18} />,
          label: t(($) => $.manageCategories),
          onClick: () => setManaging('categories'),
        },
      ]
    : [];
  const close = () => setManaging(null);

  return (
    <>
      <PanelHeader>
        <WorkspaceHeader actions={administration} />
        <PanelHeaderActions>
          <PushSettings />
        </PanelHeaderActions>
      </PanelHeader>
      {workspace && <UnreadDirectMessages />}
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
