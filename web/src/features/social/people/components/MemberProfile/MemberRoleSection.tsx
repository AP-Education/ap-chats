import { Button } from 'antd';
import { createStyles } from 'antd-style';

import type { RoleBadge } from '@/features/roles/types';

import { AddRolePopover } from './AddRolePopover';
import { MemberRoleChips } from './MemberRoleChips';

const useStyles = createStyles(({ token, css }) => ({
  section: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
  `,
  heading: css`
    margin: 0;
    color: ${token.colorTextTertiary};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  `,
}));

interface MemberRoleSectionProps {
  workspaceId: string;
  roles: RoleBadge[];
  /** Workspace managers give and take roles here. */
  canManage: boolean;
  isMobile: boolean;
  onToggle: (role: RoleBadge, assigned: boolean) => void;
  onManageRoles: () => void;
}

export function MemberRoleSection({
  workspaceId,
  roles,
  canManage,
  isMobile,
  onToggle,
  onManageRoles,
}: MemberRoleSectionProps) {
  const { styles } = useStyles();
  if (!roles.length && !canManage) return null;

  const assignedRoleIds = new Set(roles.map((role) => role.id));
  const removeRole = canManage ? (role: RoleBadge) => onToggle(role, false) : undefined;
  const addOnDesktop = canManage && !isMobile && (
    <AddRolePopover
      workspaceId={workspaceId}
      assignedRoleIds={assignedRoleIds}
      onToggle={onToggle}
    />
  );

  return (
    <section className={styles.section} aria-label="Ролі">
      <h4 className={styles.heading}>Ролі</h4>
      <MemberRoleChips roles={roles} onRemove={removeRole}>
        {addOnDesktop}
      </MemberRoleChips>
      {canManage && isMobile && (
        <Button size="small" onClick={onManageRoles}>
          Керувати ролями
        </Button>
      )}
    </section>
  );
}
