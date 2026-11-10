import { message as toast } from 'antd';

import type { SendOptionDialogProps } from '@/features/social/conversation-scope/extensions';

import { useScheduling } from '../../hooks/useScheduling';
import { SchedulePicker } from '../SchedulePicker/SchedulePicker';

/** Takes the composer's message once its time is picked; a failure leaves it in the composer. */
export function ScheduleMessageDialog({ composer, onClose }: SendOptionDialogProps) {
  const { schedule } = useScheduling();

  function pick(sendAt: Date) {
    const input = composer.read();
    if (!input) {
      void toast.warning('Спочатку завершіть завантаження файлів.');
      return;
    }

    schedule.mutate(
      { input, sendAt },
      {
        onSuccess: () => {
          composer.clear(input);
          onClose();
        },
        onError: () => toast.error('Не вдалося запланувати повідомлення.'),
      },
    );
  }

  return (
    <SchedulePicker
      title="Запланувати повідомлення"
      pending={schedule.isPending}
      onPick={pick}
      onClose={() => {
        if (!schedule.isPending) onClose();
      }}
    />
  );
}
