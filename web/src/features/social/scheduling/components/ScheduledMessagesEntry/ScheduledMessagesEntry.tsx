import { IconButton, useIsMobile } from '@ap-education/ui';
import { CalendarDotsIcon } from '@phosphor-icons/react';
import { message as toast, Popover } from 'antd';
import { createStyles, keyframes } from 'antd-style';
import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';

import { useCountRises } from '../../hooks/useCountRises';
import { useScheduledMessages } from '../../hooks/useScheduledMessages';
import { useScheduling } from '../../hooks/useScheduling';
import type { ScheduledMessage } from '../../types';
import { ScheduledMessages } from '../ScheduledMessages/ScheduledMessages';
import { SchedulePicker } from '../SchedulePicker/SchedulePicker';

const TITLE = 'Заплановані повідомлення';

const hop = keyframes`
  0%, 100% { transform: translateY(0) scale(1); }
  35% { transform: translateY(-5px) scale(1.08); }
  65% { transform: translateY(1px) scale(0.97); }
`;

const glow = keyframes`
  from { background: color-mix(in srgb, currentColor 24%, transparent); }
  to { background: transparent; }
`;

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    color: ${token.colorPrimary};

    && {
      border-radius: var(--composer-control-radius, ${token.borderRadius}px);
    }
  `,
  // A new message on the schedule, in place of a toast; without motion, the button lights up.
  arrived: css`
    animation: ${hop} 0.5s cubic-bezier(0.3, 0.7, 0.4, 1);

    @media (prefers-reduced-motion: reduce) {
      animation: ${glow} 0.9s ease-out;
    }
  `,
  title: css`
    margin: 0 0 8px;
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
  `,
}));

/** Shown in the composer while the conversation holds messages of the viewer's waiting to go out. */
export function ScheduledMessagesEntry() {
  const { styles, cx } = useStyles();
  const isMobile = useIsMobile();
  const { data } = useScheduledMessages();
  const scheduled = data ?? [];
  const arrivals = useCountRises(data?.length);
  const { reschedule } = useScheduling();
  const [listOpen, setListOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState<ScheduledMessage | null>(null);

  if (!scheduled.length && !rescheduling) return null;

  function startRescheduling(message: ScheduledMessage) {
    setListOpen(false);
    setRescheduling(message);
  }

  function pick(message: ScheduledMessage, sendAt: Date) {
    reschedule.mutate(
      { message, sendAt },
      {
        onSuccess: () => setRescheduling(null),
        onError: () => toast.error('Не вдалося змінити час.'),
      },
    );
  }

  const list = <ScheduledMessages messages={scheduled} onReschedule={startRescheduling} />;
  const button = (
    <IconButton
      key={arrivals}
      size={isMobile ? 36 : 38}
      className={cx(styles.button, arrivals > 0 && styles.arrived)}
      aria-label={`${TITLE}: ${scheduled.length}`}
      onClick={() => setListOpen(true)}
    >
      <CalendarDotsIcon size={22} />
    </IconButton>
  );

  return (
    <>
      {isMobile ? (
        <>
          {button}
          <BottomSheet open={listOpen} onClose={() => setListOpen(false)} aria-label={TITLE}>
            <h2 className={styles.title}>{TITLE}</h2>
            {list}
          </BottomSheet>
        </>
      ) : (
        <Popover
          trigger="click"
          open={listOpen}
          onOpenChange={setListOpen}
          placement="topRight"
          title={TITLE}
          content={list}
        >
          {button}
        </Popover>
      )}
      {rescheduling && (
        <SchedulePicker
          title="Змінити час"
          initial={new Date(rescheduling.sendAt)}
          pending={reschedule.isPending}
          onPick={(sendAt) => pick(rescheduling, sendAt)}
          onClose={() => setRescheduling(null)}
        />
      )}
    </>
  );
}
