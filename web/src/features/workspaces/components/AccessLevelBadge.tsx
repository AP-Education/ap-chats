import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { Dropdown, type MenuProps } from 'antd';
import { createStyles } from 'antd-style';

import type { WorkspaceAccessLevel } from '../types';
import { accessLevelLabels } from '../workspace-access';

const useStyles = createStyles(({ token, css }) => ({
  badge: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 10px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 12px;
    background: ${token.colorFillQuaternary};
    color: ${token.colorTextSecondary};
    font: inherit;
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
  `,
  editable: css`
    cursor: pointer;

    &:hover,
    &:focus-visible {
      border-color: ${token.colorPrimaryBorder};
      color: ${token.colorText};
      outline: none;
    }
  `,
  manager: css`
    border-color: ${token.colorPrimaryBorder};
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryText};
  `,
  option: css`
    display: grid;
    grid-template-columns: 1fr 16px;
    gap: 2px 12px;
    max-width: 260px;
    padding: 2px 0;
  `,
  optionLabel: css`
    font-weight: 600;
  `,
  optionHint: css`
    grid-column: 1;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.35;
    white-space: normal;
  `,
  check: css`
    grid-row: 1;
    grid-column: 2;
    color: ${token.colorPrimary};
  `,
}));

const levels: { level: WorkspaceAccessLevel; hint: string }[] = [
  { level: 'owner', hint: 'Усе, що може менеджер, і призначення рівнів доступу.' },
  { level: 'manager', hint: 'Канали, ролі та люди. Читає лише канали, де його вписали.' },
  { level: 'member', hint: 'Працює в каналах, куди його вписали.' },
];

interface AccessLevelBadgeProps {
  accessLevel: WorkspaceAccessLevel;
  /** Only owners change levels, and never their own. */
  editable: boolean;
  onChange?: (level: WorkspaceAccessLevel) => void;
}

/** A person's access level, and for the owner the menu to change it. */
export function AccessLevelBadge({ accessLevel, editable, onChange }: AccessLevelBadgeProps) {
  const { styles, cx } = useStyles();
  const badgeClass = cx(styles.badge, accessLevel !== 'member' && styles.manager);

  if (!editable) return <span className={badgeClass}>{accessLevelLabels[accessLevel]}</span>;

  const items: MenuProps['items'] = levels.map(({ level, hint }) => ({
    key: level,
    label: (
      <span className={styles.option}>
        <span className={styles.optionLabel}>{accessLevelLabels[level]}</span>
        <span className={styles.optionHint}>{hint}</span>
        {level === accessLevel && <CheckIcon size={16} weight="bold" className={styles.check} />}
      </span>
    ),
  }));

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        onClick: ({ key }) => {
          if (key !== accessLevel) onChange?.(key as WorkspaceAccessLevel);
        },
      }}
    >
      <button
        type="button"
        className={cx(badgeClass, styles.editable)}
        aria-label={`Рівень доступу: ${accessLevelLabels[accessLevel]}. Змінити`}
      >
        {accessLevelLabels[accessLevel]}
        <CaretDownIcon size={12} weight="bold" />
      </button>
    </Dropdown>
  );
}
