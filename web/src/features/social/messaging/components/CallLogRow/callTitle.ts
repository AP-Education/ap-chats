import type { TFunction } from 'i18next';

import { i18n } from '../../../../../shared/i18n/i18n';
import type { CallEntryStatus } from '../../types';

/** How a call reads from one side of it: the timeline's bubble and the conversation list agree. */
export function callTitle(
  status: CallEntryStatus,
  outgoing: boolean,
  t: TFunction<'messaging'> = i18n.getFixedT(null, 'messaging'),
): string {
  if (status === 'active') return t(($) => $.call.active);
  if (status === 'declined') return t(($) => $.call.declined);
  if (status === 'missed') return outgoing ? t(($) => $.call.unanswered) : t(($) => $.call.missed);
  return outgoing ? t(($) => $.call.outgoing) : t(($) => $.call.incoming);
}
