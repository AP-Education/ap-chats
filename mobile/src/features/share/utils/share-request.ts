import type { ShareRequest } from '../types';

const shareRequestTypes = new Set<string>([
  'share/ready',
  'share/taken',
  'share/send-part',
  'share/cancel-part',
]);

export function isShareRequest(message: { type: string }): message is ShareRequest {
  return shareRequestTypes.has(message.type);
}
