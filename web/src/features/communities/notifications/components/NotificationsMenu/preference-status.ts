import type { NotificationPreference } from './types';

export function preferenceStatus(query: {
  isPending: boolean;
  isError: boolean;
}): NotificationPreference['status'] {
  if (query.isPending) return 'loading';
  if (query.isError) return 'failed';
  return 'ready';
}
