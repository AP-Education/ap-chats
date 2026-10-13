import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Input } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useRoles } from '../../hooks/useRoles';
import type { Role } from '../../types';
import { RoleOptions } from './RoleOptions';

const useStyles = createStyles(({ css }) => ({
  picker: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    min-height: 0;
  `,
}));

interface RolePickerProps {
  workspaceId: string;
  assignedRoleIds: ReadonlySet<string>;
  onToggle: (role: Role, assigned: boolean) => void;
  autoFocus?: boolean;
}

// Like Discord's role menu: search by name, a click adds a role or takes it away.
export function RolePicker({ workspaceId, assignedRoleIds, onToggle, autoFocus }: RolePickerProps) {
  const { styles } = useStyles();
  const { query } = useRoles(workspaceId);
  const [search, setSearch] = useState('');

  const typed = search.trim().toLocaleLowerCase();
  const matches = (query.data ?? []).filter((role) =>
    role.name.toLocaleLowerCase().includes(typed),
  );

  return (
    <div className={styles.picker}>
      <Input
        autoFocus={autoFocus}
        allowClear
        prefix={<MagnifyingGlassIcon size={16} />}
        placeholder="Роль"
        aria-label="Знайти роль"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <RoleOptions
        roles={query.data && matches}
        isSearching={Boolean(typed)}
        assignedRoleIds={assignedRoleIds}
        onToggle={onToggle}
      />
    </div>
  );
}
