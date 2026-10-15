import { XIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

import { RoleDot } from '@/features/roles/components/RoleDot';
import type { RoleBadge } from '@/features/roles/types';

const useStyles = createStyles(({ token, css }) => ({
  // About four rows; a person with more roles scrolls them instead of stretching the card.
  chips: css`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    flex-shrink: 0;
    max-height: 128px;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 26px;
    padding: 0 10px 0 8px;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorFillTertiary};
    color: ${token.colorText};
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;
  `,
  remove: css`
    display: inline-grid;
    place-items: center;
    width: 14px;
    height: 14px;
    margin-right: -2px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: ${token.colorTextTertiary};
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: ${token.colorFillSecondary};
      color: ${token.colorText};
      outline: none;
    }
  `,
}));

interface MemberRoleChipsProps {
  roles: RoleBadge[];
  /** Present for workspace managers, who can take roles away right here. */
  onRemove?: (role: RoleBadge) => void;
  /** The control that adds a role, shown after the chips. */
  children?: ReactNode;
}

export function MemberRoleChips({ roles, onRemove, children }: MemberRoleChipsProps) {
  const { styles } = useStyles();

  return (
    <ul className={styles.chips} aria-label="Ролі">
      {roles.map((role) => (
        <li key={role.id} className={styles.chip}>
          <RoleDot color={role.color} />
          {role.name}
          {onRemove && (
            <button
              type="button"
              className={styles.remove}
              aria-label={`Забрати роль ${role.name}`}
              onClick={() => onRemove(role)}
            >
              <XIcon size={10} weight="bold" />
            </button>
          )}
        </li>
      ))}
      {children && <li>{children}</li>}
    </ul>
  );
}
