import { ArrowLeftIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { createStyles } from 'antd-style';

import { RolePicker } from '@/features/roles/components/RolePicker';

import { useMemberCard } from '../../stores/member-card-context';

const useStyles = createStyles(({ token, css }) => ({
  view: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    gap: ${token.marginSM}px;
    padding: 12px 16px 16px;
    text-align: left;
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  `,
  title: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${token.colorText};
    font-weight: 650;
  `,
}));

interface MemberRolesViewProps {
  name: string;
  onBack: () => void;
}

// On a phone the sheet swaps the profile for this list instead of stacking a popover on it.
export function MemberRolesView({ name, onBack }: MemberRolesViewProps) {
  const { styles } = useStyles();
  const { workspaceId, assignedRoleIds, toggleRole } = useMemberCard();

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftIcon size={20} />}
          aria-label="Назад до профілю"
          onClick={onBack}
        />
        <span className={styles.title}>Ролі: {name}</span>
      </div>
      <RolePicker
        workspaceId={workspaceId}
        assignedRoleIds={assignedRoleIds}
        onToggle={toggleRole}
      />
    </div>
  );
}
