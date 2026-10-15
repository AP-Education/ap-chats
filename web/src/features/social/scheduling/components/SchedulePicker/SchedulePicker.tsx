import { useIsMobile } from '@ap-education/ui';
import { Button, Input, Modal } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';

import {
  fromLocalInputValue,
  isSendTimeAllowed,
  latestSendTime,
  localInputValue,
  sendTimeLabel,
  sendTimeOptions,
} from '../../send-times';

const dayFormat = new Intl.DateTimeFormat('uk-UA', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const useStyles = createStyles(({ token, css }) => ({
  title: css`
    margin: 0 0 8px;
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
  `,
  options: css`
    display: flex;
    flex-direction: column;
    padding-bottom: 8px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  option: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
    padding: 8px 12px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: ${token.colorText};
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover,
    &:active {
      background: ${token.colorFillTertiary};
    }

    &:disabled {
      color: ${token.colorTextDisabled};
      cursor: default;
    }
  `,
  day: css`
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,
  custom: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 12px 4px;
  `,
  customLabel: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
}));

interface SchedulePickerProps {
  title: string;
  initial?: Date;
  pending: boolean;
  onPick: (sendAt: Date) => void;
  onClose: () => void;
}

/** When a message goes out: a few quick picks, or any minute within a year. */
export function SchedulePicker({ title, initial, pending, onPick, onClose }: SchedulePickerProps) {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const [now] = useState(() => new Date());
  const options = sendTimeOptions(now);
  const [custom, setCustom] = useState(() => localInputValue(initial ?? options[0]!.sendAt));

  const customTime = fromLocalInputValue(custom);
  const isCustomAllowed = customTime !== null && isSendTimeAllowed(customTime, new Date());

  const content = (
    <>
      <div className={styles.options}>
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            className={styles.option}
            disabled={pending}
            onClick={() => onPick(option.sendAt)}
          >
            <span>{option.label}</span>
            <span className={styles.day}>{dayFormat.format(option.sendAt)}</span>
          </button>
        ))}
      </div>
      <div className={styles.custom}>
        <label className={styles.customLabel} htmlFor="schedule-picker-time">
          Свій час
        </label>
        <Input
          id="schedule-picker-time"
          type="datetime-local"
          value={custom}
          min={localInputValue(now)}
          max={localInputValue(latestSendTime(now))}
          onChange={(event) => setCustom(event.target.value)}
        />
        <Button
          type="primary"
          block
          loading={pending}
          disabled={!isCustomAllowed}
          onClick={() => customTime && onPick(customTime)}
        >
          {isCustomAllowed ? `Надіслати ${sendTimeLabel(customTime, now)}` : 'Оберіть інший час'}
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet open onClose={onClose} aria-label={title}>
        <h2 className={styles.title}>{title}</h2>
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal open onCancel={onClose} footer={null} width={380} title={title}>
      {content}
    </Modal>
  );
}
