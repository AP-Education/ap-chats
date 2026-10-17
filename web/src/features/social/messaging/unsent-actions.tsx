import { ArrowClockwiseIcon, TrashIcon, XCircleIcon } from '@phosphor-icons/react';

import type { ConversationAction, DeliveryStatus } from './types';
import type { UnsentMessages } from './unsent-messages-context';

/** What an unsent message offers in place of the usual actions: withdrawing it while it is
 * on its way, as on Telegram, or once it failed, another try. */
export function unsentActions(
  delivery: DeliveryStatus,
  unsent: UnsentMessages,
): ConversationAction[] {
  const always = () => true;
  const discard = (rowId: string) => unsent.discard(rowId);

  if (delivery !== 'failed') {
    return [
      {
        id: 'cancel-sending',
        icon: <XCircleIcon size={18} />,
        accent: 'danger',
        label: () => 'Скасувати надсилання',
        available: always,
        execute: (target) => discard(target.items[0]!.id),
      },
    ];
  }
  return [
    {
      id: 'resend',
      icon: <ArrowClockwiseIcon size={18} />,
      label: () => 'Надіслати ще раз',
      available: always,
      execute: (target) => unsent.retry(target.items[0]!.id),
    },
    {
      id: 'delete',
      icon: <TrashIcon size={18} />,
      accent: 'danger',
      label: () => 'Видалити',
      available: always,
      execute: (target) => discard(target.items[0]!.id),
    },
  ];
}
