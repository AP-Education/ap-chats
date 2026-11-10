import { PlusIcon } from '@phosphor-icons/react';
import { Button, Input, message } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/shared/api/http';

import { useRoles } from '../../hooks/useRoles';
import type { Role } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  icon: css`
    color: ${token.colorTextTertiary};
  `,
  // Always rendered: antd rebuilds the input, and drops its focus, when a suffix appears.
  suffix: css`
    display: inline-flex;
    min-height: 24px;
  `,
}));

interface NewRoleFieldProps {
  workspaceId: string;
  onCreated: (role: Role) => void;
}

export function NewRoleField({ workspaceId, onCreated }: NewRoleFieldProps) {
  const { styles } = useStyles();
  const { t } = useTranslation(['roles', 'common']);
  const { create } = useRoles(workspaceId);
  const [name, setName] = useState('');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(
      { name: trimmed },
      {
        onSuccess: (role) => {
          setName('');
          onCreated(role);
        },
        onError: (error) =>
          void message.error(
            error instanceof ApiError && error.status === 409
              ? t(($) => $.nameTaken)
              : t(($) => $.newRole.createFailed),
          ),
      },
    );
  }

  return (
    <Input
      variant="filled"
      prefix={<PlusIcon size={16} className={styles.icon} />}
      placeholder={t(($) => $.newRole.placeholder)}
      aria-label={t(($) => $.newRole.label)}
      maxLength={80}
      value={name}
      onChange={(event) => setName(event.target.value)}
      onPressEnter={submit}
      suffix={
        <span className={styles.suffix}>
          {name.trim() && (
            <Button type="link" size="small" loading={create.isPending} onClick={submit}>
              {t(($) => $.common.actions.add)}
            </Button>
          )}
        </span>
      }
    />
  );
}
