import { CaretRightIcon } from '@phosphor-icons/react';
import { Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import type { AccessEntry } from '../../access-entries';
import type { Principal } from '../../types';
import { PrincipalLabel } from './PrincipalLabel';
import type { PrincipalDetails } from './usePrincipalDirectory';

const useStyles = createStyles(({ token, css }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0 0 ${token.marginSM}px;
    padding: 0;
    list-style: none;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 48px;
    padding: 8px 10px;
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
  `,
  principal: css`
    flex: 1;
    min-width: 0;
  `,
  level: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
  chevron: css`
    color: ${token.colorTextTertiary};
  `,
  empty: css`
    display: block;
    margin-bottom: ${token.marginSM}px;
  `,
}));

interface AccessEntryRowsProps {
  entries: AccessEntry[];
  describe: (principal: Principal) => PrincipalDetails;
  disabled?: boolean;
  onOpen: (key: string) => void;
}

export function AccessEntryRows({ entries, describe, disabled, onOpen }: AccessEntryRowsProps) {
  const { t } = useTranslation('communities');
  const { styles } = useStyles();

  if (!entries.length)
    return (
      <Typography.Text type="secondary" className={styles.empty}>
        {t(($) => $.access.nobody)}
      </Typography.Text>
    );

  return (
    <ul className={styles.list}>
      {entries.map((entry) => {
        const details = describe(entry.principal);
        return (
          <li key={details.key}>
            <button
              type="button"
              className={styles.row}
              disabled={disabled}
              onClick={() => onOpen(details.key)}
            >
              <span className={styles.principal}>
                <PrincipalLabel details={details} />
              </span>
              <span className={styles.level}>
                {t(($) => $.access.capabilities[entry.level].label)}
              </span>
              <CaretRightIcon size={16} className={styles.chevron} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
