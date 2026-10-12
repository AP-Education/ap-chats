import { ContentState, ContentStateDescription, useIsMobile } from '@ap-education/ui';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { AdaptiveModal } from '@/shared/ui/AdaptiveModal';

import { useRoles } from '../../hooks/useRoles';
import { MobileRolesLayout } from './MobileRolesLayout';
import { NewRoleField } from './NewRoleField';
import { RoleDetails } from './RoleDetails';
import { RoleList } from './RoleList';

const useStyles = createStyles(({ token, css }) => ({
  layout: css`
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: ${token.marginLG}px;
    height: 100%;
  `,
  // Each column scrolls on its own inside the dialog's fixed height.
  sidebar: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
    min-height: 0;
    padding-right: ${token.marginLG}px;
    border-right: 1px solid ${token.colorBorderSecondary};
    overflow-y: auto;
  `,
  details: css`
    min-height: 0;
    overflow-y: auto;
  `,
  stacked: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
  `,
}));

interface RolesModalProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}

// Managers group people here; what a role may do is set in each channel's access lists.
export function RolesModal({ workspaceId, open, onClose }: RolesModalProps) {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const { query, reorder } = useRoles(workspaceId);
  const [selectedRoleId, setSelectedRoleId] = useState<string>();

  const selectedRole = query.data?.find((role) => role.id === selectedRoleId);

  const list = (
    <div className={isMobile ? styles.stacked : styles.sidebar}>
      <NewRoleField workspaceId={workspaceId} onCreated={(role) => setSelectedRoleId(role.id)} />
      <RoleList
        roles={query.data}
        isError={query.isError}
        selectedRoleId={selectedRoleId}
        onSelect={setSelectedRoleId}
        onReorder={isMobile ? undefined : (roleIds) => reorder.mutate(roleIds)}
        onRetry={() => void query.refetch()}
      />
    </div>
  );
  const details = selectedRole ? (
    <RoleDetails
      key={selectedRole.id}
      workspaceId={workspaceId}
      role={selectedRole}
      onDeleted={() => setSelectedRoleId(undefined)}
    />
  ) : (
    <ContentState compact>
      <ContentStateDescription>Виберіть роль, щоб керувати її складом</ContentStateDescription>
    </ContentState>
  );

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Ролі"
      description="Групи людей для згадок і списків доступу каналів"
      bodyHeight="min(560px, 72vh)"
      width={720}
      destroyOnHidden
      centered
    >
      {isMobile ? (
        <MobileRolesLayout
          list={list}
          details={selectedRole && details}
          onBack={() => setSelectedRoleId(undefined)}
        />
      ) : (
        <div className={styles.layout}>
          {list}
          <div className={styles.details}>{details}</div>
        </div>
      )}
    </AdaptiveModal>
  );
}
