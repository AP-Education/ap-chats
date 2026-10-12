import { PlusIcon } from '@phosphor-icons/react';
import { Popover } from 'antd';
import { createStyles } from 'antd-style';

import { RolePicker } from '@/features/roles/components/RolePicker';
import type { RoleBadge } from '@/features/roles/types';

const useStyles = createStyles(({ token, css }) => ({
  trigger: css`
    display: inline-grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorFillTertiary};
    color: ${token.colorTextSecondary};
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: ${token.colorFillSecondary};
      color: ${token.colorText};
      outline: none;
    }
  `,
  picker: css`
    display: flex;
    flex-direction: column;
    width: 240px;
    max-height: 320px;
  `,
}));

interface AddRolePopoverProps {
  workspaceId: string;
  assignedRoleIds: ReadonlySet<string>;
  onToggle: (role: RoleBadge, assigned: boolean) => void;
}

export function AddRolePopover({ workspaceId, assignedRoleIds, onToggle }: AddRolePopoverProps) {
  const { styles } = useStyles();

  return (
    <Popover
      trigger="click"
      placement="bottom"
      arrow={false}
      destroyOnHidden
      content={
        <div className={styles.picker}>
          <RolePicker
            workspaceId={workspaceId}
            assignedRoleIds={assignedRoleIds}
            onToggle={onToggle}
            autoFocus
          />
        </div>
      }
    >
      <button type="button" className={styles.trigger} aria-label="Додати роль">
        <PlusIcon size={14} weight="bold" />
      </button>
    </Popover>
  );
}
