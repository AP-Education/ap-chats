import { useShellLocale } from '@ap-education/shell-sdk';
import { IconButton } from '@ap-education/ui';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { dateTimeFormat } from '@/shared/i18n/format';

import {
  addMonths,
  firstWeekColumn,
  isSameDay,
  monthDays,
  monthTitle,
  startOfMonth,
  weekdayLabels,
} from '../../calendar';
import { isSendDayOpen, latestSendTime } from '../../send-times';

const dayLabel = dateTimeFormat({
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const useStyles = createStyles(({ token, css }) => ({
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  `,
  month: css`
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
  `,
  steps: css`
    display: flex;
    gap: 2px;
    color: ${token.colorTextSecondary};
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    justify-items: center;
  `,
  weekday: css`
    padding-bottom: 4px;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,
  // The first day starts under its own weekday. Room for six weeks always, so stepping
  // between months never moves what sits below the calendar.
  days: css`
    grid-template-rows: repeat(6, 36px);
    row-gap: 2px;

    & > :first-child {
      grid-column-start: var(--first-column);
    }
  `,
  day: css`
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorText};
    font: inherit;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: background ${token.motionDurationFast};

    &:hover:not(:disabled) {
      background: ${token.colorFillTertiary};
    }

    &:disabled {
      color: ${token.colorTextDisabled};
      cursor: default;
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 1px;
    }
  `,
  today: css`
    box-shadow: inset 0 0 0 1px ${token.colorPrimary};
  `,
  selected: css`
    && {
      background: ${token.colorPrimary};
      color: ${token.colorTextLightSolid};
    }
  `,
}));

interface MonthCalendarProps {
  month: Date;
  selected: Date;
  now: Date;
  onMonthChange: (month: Date) => void;
  onSelect: (day: Date) => void;
}

/** A month of days to send on, Monday first; past days and those beyond a year stay closed. */
export function MonthCalendar({
  month,
  selected,
  now,
  onMonthChange,
  onSelect,
}: MonthCalendarProps) {
  const { styles, cx } = useStyles();
  const { t } = useTranslation('scheduling');
  const locale = useShellLocale();
  const canGoBack = month > startOfMonth(now);
  const canGoForward = month < startOfMonth(latestSendTime(now));
  const layout = { '--first-column': firstWeekColumn(month) } as CSSProperties;

  return (
    <div>
      <div className={styles.header}>
        <span className={styles.month}>{monthTitle(month, locale)}</span>
        <div className={styles.steps}>
          <IconButton
            size={32}
            aria-label={t(($) => $.previousMonth)}
            disabled={!canGoBack}
            onClick={() => onMonthChange(addMonths(month, -1))}
          >
            <CaretLeftIcon size={18} />
          </IconButton>
          <IconButton
            size={32}
            aria-label={t(($) => $.nextMonth)}
            disabled={!canGoForward}
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <CaretRightIcon size={18} />
          </IconButton>
        </div>
      </div>
      <div className={styles.grid} aria-hidden="true">
        {weekdayLabels(locale).map((label) => (
          <span key={label} className={styles.weekday}>
            {label}
          </span>
        ))}
      </div>
      <div className={cx(styles.grid, styles.days)} style={layout}>
        {monthDays(month).map((day) => {
          const isSelected = isSameDay(day, selected);
          return (
            <button
              key={day.getDate()}
              type="button"
              className={cx(
                styles.day,
                isSameDay(day, now) && styles.today,
                isSelected && styles.selected,
              )}
              aria-label={dayLabel(locale).format(day)}
              aria-pressed={isSelected}
              disabled={!isSendDayOpen(day, now)}
              onClick={() => onSelect(day)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
