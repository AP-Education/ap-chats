import { UserPlusIcon } from '@phosphor-icons/react';
import { Button, message, Select } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';
import { compareNames } from '@/shared/lib/compare-names';

import { useRoleMembers } from '../../hooks/useRoleMembers';
import { useRoleMembership } from '../../hooks/useRoleMembership';
import { RoleMemberList } from './RoleMemberList';

const useStyles = createStyles(({ token, css }) => ({
  adder: css`
    display: flex;
    gap: ${token.marginXS}px;
  `,
  picker: css`
    flex: 1;
    min-width: 0;
  `,
}));

interface RoleMembersProps {
  workspaceId: string;
  roleId: string;
}

export function RoleMembers({ workspaceId, roleId }: RoleMembersProps) {
  const { styles } = useStyles();
  const { t } = useTranslation(['roles', 'common']);
  const members = useRoleMembers(workspaceId, roleId);
  const { add, remove } = useRoleMembership(workspaceId);
  const workspaceMembers = useWorkspaceMembers(workspaceId);
  const [picked, setPicked] = useState<string[]>([]);

  const inRole = new Set((members.data ?? []).map((member) => member.memberId));
  const candidates = (workspaceMembers.data ?? [])
    .filter((member) => !inRole.has(member.id))
    .map((member) => ({
      value: member.id,
      label: member.profile.displayName ?? t(($) => $.unnamedMember),
    }))
    .sort((a, b) => compareNames(a.label, b.label));

  function addPicked() {
    add.mutate(
      { roleId, memberIds: picked },
      {
        onSuccess: () => setPicked([]),
        onError: () => void message.error(t(($) => $.members.addFailed)),
      },
    );
  }

  function removeMember(memberId: string) {
    remove.mutate(
      { roleId, memberId },
      {
        onError: () => void message.error(t(($) => $.members.removeFailed)),
      },
    );
  }

  return (
    <div>
      <div className={styles.adder}>
        <Select
          mode="multiple"
          className={styles.picker}
          aria-label={t(($) => $.members.addLabel)}
          placeholder={t(($) => $.members.addPlaceholder)}
          value={picked}
          onChange={setPicked}
          options={candidates}
          optionFilterProp="label"
          loading={workspaceMembers.isPending}
          maxTagCount="responsive"
        />
        <Button
          icon={<UserPlusIcon size={16} />}
          disabled={!picked.length}
          loading={add.isPending}
          onClick={addPicked}
        >
          {t(($) => $.common.actions.add)}
        </Button>
      </div>
      <RoleMemberList members={members.data} onRemove={removeMember} />
    </div>
  );
}
