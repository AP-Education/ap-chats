import { TrashIcon } from '@phosphor-icons/react';
import { Button, Input, message, Popconfirm, Switch, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

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
              ? 'Роль із такою назвою вже є.'
              : 'Не вдалося перейменувати роль.',
          );
        },
      },
    );
  }

  function recolor(color: string) {
    update.mutate(
      { roleId: role.id, input: { color } },
      { onError: () => void message.error('Не вдалося змінити колір ролі.') },
    );
  }

  function hoist(isHoisted: boolean) {
    update.mutate(
      { roleId: role.id, input: { isHoisted } },
      { onError: () => void message.error('Не вдалося змінити показ ролі.') },
    );
  }

  function deleteRole() {
    remove.mutate(role.id, {
      onSuccess: onDeleted,
      onError: () => void message.error('Не вдалося видалити роль.'),
    });
  }

  return (
    <div className={styles.details}>
      <div className={styles.section}>
        <span className={styles.label}>Назва</span>
        <Input
          aria-label="Назва ролі"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={rename}
          onPressEnter={rename}
        />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Колір</span>
        <RoleColorPicker value={role.color} onChange={recolor} />
      </div>

      <div className={styles.toggle}>
        <div className={styles.section}>
          <span className={styles.label}>Показувати окремо</span>
          <Typography.Text type="secondary" className={styles.hint}>
            Люди з цією роллю стоять окремою групою в списку учасників каналу. Порядок груп
            задається перетягуванням ролей у списку.
          </Typography.Text>
        </div>
        <Switch
          aria-label="Показувати окремо в списку учасників"
          checked={role.isHoisted}
          loading={update.isPending}
          onChange={hoist}
        />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Люди</span>
        <Typography.Text type="secondary" className={styles.hint}>
          Роль сама нічого не дозволяє. Вона відкриває канали, у списках яких стоїть.
        </Typography.Text>
        <RoleMembers workspaceId={workspaceId} roleId={role.id} />
      </div>

      <Popconfirm
        title="Видалити роль?"
        description="Люди втратять доступ до каналів, який давала ця роль."
        okText="Видалити"
        okButtonProps={{ danger: true, loading: remove.isPending }}
        cancelText="Скасувати"
        onConfirm={deleteRole}
      >
        <Button type="text" danger icon={<TrashIcon size={18} />}>
          Видалити роль
        </Button>
      </Popconfirm>
    </div>
  );
}
