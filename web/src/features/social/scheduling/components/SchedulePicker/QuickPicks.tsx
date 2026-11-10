import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import type { SendTimeOption } from '../../send-times';

const useStyles = createStyles(({ css }) => ({
  picks: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  `,
}));

interface QuickPicksProps {
  options: SendTimeOption[];
  picked: Date | null;
  onPick: (sendAt: Date) => void;
}

/** Common send times that fill in the day and the time at once. */
export function QuickPicks({ options, picked, onPick }: QuickPicksProps) {
  const { styles } = useStyles();
  const { t } = useTranslation('scheduling');

  return (
    <div className={styles.picks} role="group" aria-label={t(($) => $.quickPicks)}>
      {options.map((option) => {
        const isPicked = picked?.getTime() === option.sendAt.getTime();
        return (
          <Button
            key={option.label}
            size="small"
            variant="filled"
            color={isPicked ? 'primary' : 'default'}
            aria-pressed={isPicked}
            onClick={() => onPick(option.sendAt)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
