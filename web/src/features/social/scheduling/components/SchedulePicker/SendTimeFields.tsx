import { createStyles } from 'antd-style';

import type { useSendTimePick } from '../../hooks/useSendTimePick';
import { MonthCalendar } from './MonthCalendar';
import { QuickPicks } from './QuickPicks';
import { TimeField } from './TimeField';

const useStyles = createStyles(({ css }) => ({
  fields: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
}));

interface SendTimeFieldsProps {
  pick: ReturnType<typeof useSendTimePick>;
}

export function SendTimeFields({ pick }: SendTimeFieldsProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.fields}>
      <QuickPicks options={pick.options} picked={pick.picked} onPick={pick.pick} />
      <MonthCalendar
        month={pick.month}
        selected={pick.day}
        now={pick.now}
        onMonthChange={pick.setMonth}
        onSelect={pick.setDay}
      />
      <TimeField value={pick.time} onChange={pick.setTime} />
    </div>
  );
}
