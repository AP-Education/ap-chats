import { message as toast } from 'antd';
import { useTranslation } from 'react-i18next';

import type { SendOptionDialogProps } from '@/features/social/conversation-scope/extensions';

import { useScheduling } from '../../hooks/useScheduling';
import { SchedulePicker } from '../SchedulePicker/SchedulePicker';

/** Takes the composer's message once its time is picked; a failure leaves it in the composer. */
export function ScheduleMessageDialog({ composer, onClose }: SendOptionDialogProps) {
  const { t } = useTranslation('scheduling');
  const { schedule } = useScheduling();

  function pick(sendAt: Date) {
    schedule.mutate(
      { input: composer.read(), sendAt },
      {
        onSuccess: () => {
          composer.clear();
          onClose();
        },
        onError: () => toast.error(t(($) => $.errors.schedule)),
      },
    );
  }

  return (
    <SchedulePicker
      title={t(($) => $.scheduleMessage)}
      pending={schedule.isPending}
      onPick={pick}
      onClose={onClose}
    />
  );
}
