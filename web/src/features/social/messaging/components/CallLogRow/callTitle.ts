import type { CallEntryStatus } from '../../types';

/** How a call reads from one side of it: the timeline's bubble and the conversation list agree. */
export function callTitle(status: CallEntryStatus, outgoing: boolean): string {
  if (status === 'active') return 'Дзвінок триває';
  if (status === 'declined') return 'Дзвінок відхилено';
  if (status === 'missed') return outgoing ? 'Дзвінок без відповіді' : 'Пропущений дзвінок';
  return outgoing ? 'Вихідний дзвінок' : 'Вхідний дзвінок';
}
