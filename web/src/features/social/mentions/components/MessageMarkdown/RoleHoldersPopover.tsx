import { Popover } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactElement } from 'react';

import { RoleDot } from '@/features/roles/components/RoleDot';
import { useRoleMembers } from '@/features/roles/hooks/useRoleMembers';
import type { Role } from '@/features/roles/types';

import { RoleHolderList } from './RoleHolderList';

const useStyles = createStyles(({ token, css }) => ({
  surface: css`
    overflow: hidden;
    width: min(260px, calc(100vw - 32px));
    padding: 0;
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: ${token.boxShadowSecondary};
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 12px 6px;
    font-weight: 600;
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  count: css`
    color: ${token.colorTextTertiary};
    font-weight: 500;
  `,
}));

interface RoleHoldersProps {
  workspaceId: string;
  role: Pick<Role, 'id' | 'name' | 'color'>;
}

// Mounted only while open, so the list is asked for when someone looks at it.
function RoleHolders({ workspaceId, role }: RoleHoldersProps) {
  const { styles } = useStyles();
  const holders = useRoleMembers(workspaceId, role.id);

  return (
    <div
      role="dialog"
      aria-label={`Роль ${role.name}`}
      // Portal events still bubble through React to the host row's selection and menu.
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <div className={styles.header}>
        <RoleDot color={role.color} />
        <span className={styles.name}>{role.name}</span>
        {holders.data && <span className={styles.count}>{holders.data.length}</span>}
      </div>
      <RoleHolderList workspaceId={workspaceId} holders={holders.data} />
    </div>
  );
}

interface RoleHoldersPopoverProps extends RoleHoldersProps {
  children: ReactElement;
}

/** A role's tag that opens who holds it, as Discord's role mention does. */
export function RoleHoldersPopover({ workspaceId, role, children }: RoleHoldersPopoverProps) {
  const { styles } = useStyles();

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      destroyOnHidden
      classNames={{ container: styles.surface }}
      styles={{ container: { padding: 0 }, content: { padding: 0 } }}
      content={<RoleHolders workspaceId={workspaceId} role={role} />}
    >
      {children}
    </Popover>
  );
}
