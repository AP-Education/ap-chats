import { TrashIcon } from '@phosphor-icons/react';
import { Button, Input, message, Popconfirm, Switch, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/shared/api/http';

import { useRoles } from '../../hooks/useRoles';
import type { Role } from '../../types';
import { RoleColorPicker } from './RoleColorPicker';
import { RoleMembers } from './RoleMembers';

const useStyles = createStyles(({ token, css }) => ({
  details: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginMD}px;
    min-width: 0;
  `,
  section: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  label: css`
    font-weight: 600;
  `,
  toggle: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${token.marginSM}px;
  `,
  hint: css`
    font-size: ${token.fontSizeSM}px;
  `,
}));

interface RoleDetailsProps {
  workspaceId: string;
  role: Role;
  onDeleted: () => void;
}

export function RoleDetails({ workspaceId, role, onDeleted }: RoleDetailsProps) {
  const { styles } = useStyles();
  const { t } = useTranslation(['roles', 'common']);
  const { update, remove } = useRoles(workspaceId);
  const [name, setName] = useState(role.name);

  function rename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === role.name) return setName(role.name);
    update.mutate(
      { roleId: role.id, input: { name: trimmed } },
      {
        onError: (error) => {
          setName(role.name);
          void message.error(
            error instanceof ApiError && error.status === 409
              ? t(($) => $.nameTaken)
              : t(($) => $.details.renameFailed),
          );
        },
      },
    );
  }

  function recolor(color: string) {
    update.mutate(
      { roleId: role.id, input: { color } },
      { onError: () => void message.error(t(($) => $.details.recolorFailed)) },
    );
  }

  function hoist(isHoisted: boolean) {
    update.mutate(
      { roleId: role.id, input: { isHoisted } },
      { onError: () => void message.error(t(($) => $.details.hoistFailed)) },
    );
  }

  function deleteRole() {
    remove.mutate(role.id, {
      onSuccess: onDeleted,
      onError: () => void message.error(t(($) => $.details.deleteFailed)),
    });
  }

  return (
    <div className={styles.details}>
      <div className={styles.section}>
        <span className={styles.label}>{t(($) => $.details.name)}</span>
        <Input
          aria-label={t(($) => $.details.nameLabel)}
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={rename}
          onPressEnter={rename}
        />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>{t(($) => $.details.color)}</span>
        <RoleColorPicker value={role.color} onChange={recolor} />
      </div>

      <div className={styles.toggle}>
        <div className={styles.section}>
          <span className={styles.label}>{t(($) => $.details.hoist)}</span>
          <Typography.Text type="secondary" className={styles.hint}>
            {t(($) => $.details.hoistHint)}
          </Typography.Text>
        </div>
        <Switch
          aria-label={t(($) => $.details.hoistLabel)}
          checked={role.isHoisted}
          loading={update.isPending}
          onChange={hoist}
        />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>{t(($) => $.details.people)}</span>
        <Typography.Text type="secondary" className={styles.hint}>
          {t(($) => $.details.peopleHint)}
        </Typography.Text>
        <RoleMembers workspaceId={workspaceId} roleId={role.id} />
      </div>

      <Popconfirm
        title={t(($) => $.details.deleteTitle)}
        description={t(($) => $.details.deleteDescription)}
        okText={t(($) => $.common.actions.delete)}
        okButtonProps={{ danger: true, loading: remove.isPending }}
        cancelText={t(($) => $.common.actions.cancel)}
        onConfirm={deleteRole}
      >
        <Button type="text" danger icon={<TrashIcon size={18} />}>
          {t(($) => $.details.deleteRole)}
        </Button>
      </Popconfirm>
    </div>
  );
}
