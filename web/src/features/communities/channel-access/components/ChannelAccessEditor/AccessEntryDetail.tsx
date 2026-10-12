import { ArrowLeftIcon, TrashIcon } from '@phosphor-icons/react';
import { Button, Switch, Typography } from 'antd';
import { createStyles } from 'antd-style';

import { type AccessEntry, grants, switchCapability } from '../../access-entries';
import { channelCapabilities, type ChannelCapability } from '../../types';
import { PrincipalLabel } from './PrincipalLabel';
import type { PrincipalDetails } from './usePrincipalDirectory';

const useStyles = createStyles(({ token, css }) => ({
  detail: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginSM}px;
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-weight: 600;
  `,
  rights: css`
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  `,
  right: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${token.marginMD}px;
    padding: 12px 0;

    & + & {
      border-top: 1px solid ${token.colorBorderSecondary};
    }
  `,
  text: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  label: css`
    font-weight: 600;
  `,
  hint: css`
    font-size: ${token.fontSizeSM}px;
    line-height: 1.35;
  `,
  remove: css`
    align-self: flex-start;
  `,
}));

const rights: Record<ChannelCapability, { label: string; hint: string }> = {
  view: { label: 'Бачить', hint: 'Читає історію, реагує й отримує сповіщення.' },
  post: { label: 'Пише', hint: 'Пише повідомлення, відповідає в тредах і починає дзвінки.' },
  manage: {
    label: 'Керує',
    hint: 'Змінює канал і доступ до нього, прибирає чужі повідомлення.',
  },
};

interface AccessEntryDetailProps {
  entry: AccessEntry;
  details: PrincipalDetails;
  disabled?: boolean;
  /** `null` takes the principal off the channel. */
  onLevelChange: (level: ChannelCapability | null) => void;
  onBack: () => void;
}

export function AccessEntryDetail({
  entry,
  details,
  disabled,
  onLevelChange,
  onBack,
}: AccessEntryDetailProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.detail}>
      <div className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftIcon size={18} />}
          aria-label="Назад до списку"
          onClick={onBack}
        />
        <PrincipalLabel details={details} />
      </div>

      <ul className={styles.rights}>
        {channelCapabilities.map((capability) => (
          <li key={capability} className={styles.right}>
            <span className={styles.text}>
              <span className={styles.label}>{rights[capability].label}</span>
              <Typography.Text type="secondary" className={styles.hint}>
                {rights[capability].hint}
              </Typography.Text>
            </span>
            <Switch
              aria-label={rights[capability].label}
              checked={grants(entry.level, capability)}
              disabled={disabled}
              onChange={(enabled) =>
                onLevelChange(switchCapability(entry.level, capability, enabled))
              }
            />
          </li>
        ))}
      </ul>

      <Button
        type="text"
        danger
        className={styles.remove}
        icon={<TrashIcon size={18} />}
        disabled={disabled}
        onClick={() => onLevelChange(null)}
      >
        Прибрати з каналу
      </Button>
    </div>
  );
}
