import { message as toast } from 'antd';

import type { SendOptionDialogProps } from '@/features/social/conversation-scope/extensions';

import { useScheduling } from '../../hooks/useScheduling';
import { SchedulePicker } from '../SchedulePicker/SchedulePicker';

/** Takes the composer's message once its time is picked; a failure leaves it in the composer. */
export function ScheduleMessageDialog({ composer, onClose }: SendOptionDialogProps) {
  const { schedule } = useScheduling();

  function pick(sendAt: Date) {
    schedule.mutate(
      { input: composer.read(), sendAt },
      {
        onSuccess: () => {
          composer.clear();
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
      onClose={onClose}
    />
  );
}
