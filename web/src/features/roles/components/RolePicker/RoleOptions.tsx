import { CheckIcon } from '@phosphor-icons/react';
import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';

import type { Role } from '../../types';
import { RoleDot } from '../RoleDot';

const useStyles = createStyles(({ token, css }) => ({
  // Scrolls within whatever height the picker's container leaves it.
  list: css`
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  `,
  option: css`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 36px;
    padding: 6px 8px;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorText};
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: ${token.colorFillTertiary};
      outline: none;
    }

    @media (max-width: ${token.screenMD}px) {
      min-height: 44px;
    }
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  check: css`
    color: ${token.colorPrimary};
  `,
  empty: css`
    padding: 8px;
    color: ${token.colorTextTertiary};
  `,
}));

interface RoleOptionsProps {
  roles: Role[] | undefined;
  isSearching: boolean;
  assignedRoleIds: ReadonlySet<string>;
  onToggle: (role: Role, assigned: boolean) => void;
}

export function RoleOptions({ roles, isSearching, assignedRoleIds, onToggle }: RoleOptionsProps) {
  const { styles } = useStyles();

  if (!roles) return <Skeleton active title={false} paragraph={{ rows: 3 }} />;
  if (!roles.length)
    return (
      <div className={styles.empty}>{isSearching ? 'Ролей не знайдено' : 'Ролей ще немає'}</div>
    );

  return (
    <ul className={styles.list} role="listbox" aria-multiselectable>
      {roles.map((role) => {
        const isAssigned = assignedRoleIds.has(role.id);
        return (
          <li key={role.id} role="option" aria-selected={isAssigned}>
            <button
              type="button"
              className={styles.option}
              onClick={() => onToggle(role, !isAssigned)}
            >
              <RoleDot color={role.color} />
              <span className={styles.name}>{role.name}</span>
              {isAssigned && <CheckIcon size={16} weight="bold" className={styles.check} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
