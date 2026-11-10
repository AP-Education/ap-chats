import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { Dropdown, type MenuProps } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import type { WorkspaceAccessLevel } from '../types';

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

const levels: WorkspaceAccessLevel[] = ['owner', 'manager', 'member'];

interface AccessLevelBadgeProps {
  accessLevel: WorkspaceAccessLevel;
  /** Only owners change levels, and never their own. */
  editable: boolean;
  onChange?: (level: WorkspaceAccessLevel) => void;
}

/** A person's access level, and for the owner the menu to change it. */
export function AccessLevelBadge({ accessLevel, editable, onChange }: AccessLevelBadgeProps) {
  const { styles, cx } = useStyles();
  const { t } = useTranslation('workspaces');
  const badgeClass = cx(styles.badge, accessLevel !== 'member' && styles.manager);

  const levelLabel = t(($) => $.accessLevels[accessLevel]);

  if (!editable) return <span className={badgeClass}>{levelLabel}</span>;

  const items: MenuProps['items'] = levels.map((level) => ({
    key: level,
    label: (
      <span className={styles.option}>
        <span className={styles.optionLabel}>{t(($) => $.accessLevels[level])}</span>
        <span className={styles.optionHint}>{t(($) => $.accessLevelHints[level])}</span>
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
        aria-label={t(($) => $.accessLevelLabel, { level: levelLabel })}
      >
        {levelLabel}
        <CaretDownIcon size={12} weight="bold" />
      </button>
    </Dropdown>
  );
}
