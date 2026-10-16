import { message as toast } from 'antd';

import { useScheduling } from '../../hooks/useScheduling';
import type { ScheduleRequest } from '../../types';
import { SchedulePicker } from '../SchedulePicker/SchedulePicker';

interface ScheduleMessageDialogProps {
  request: ScheduleRequest;
  onClose: () => void;
}

/** Takes the composer's message once its time is picked; a failure leaves it in the composer. */
export function ScheduleMessageDialog({ request, onClose }: ScheduleMessageDialogProps) {
  const { schedule } = useScheduling();

  function pick(sendAt: Date) {
    schedule.mutate(
      { input: request.input, sendAt },
      {
        onSuccess: () => {
          request.onScheduled();
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
