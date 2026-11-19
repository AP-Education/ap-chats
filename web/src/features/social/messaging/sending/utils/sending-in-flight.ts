import type { UploadDraft } from '@ap-education/timeline/composer';

import type { OutboxEntry } from '../types';

const IN_FLIGHT_FILE = new Set<UploadDraft<unknown>['status']>([
  'queued',
  'uploading',
  'processing',
]);

/**
 * Whether a conversation has a message on its way or a composer file going up. Its words survive a
 * reload, being stored; a file mid-upload and the request carrying a message do not.
 */
export function sendingInFlight(
  entries: readonly OutboxEntry[],
  composerFiles: readonly Pick<UploadDraft<unknown>, 'status'>[],
): boolean {
  return (
    entries.some((entry) => entry.status !== 'failed') ||
    composerFiles.some((file) => IN_FLIGHT_FILE.has(file.status))
  );
}
