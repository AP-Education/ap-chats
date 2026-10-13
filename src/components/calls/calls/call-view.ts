import type { CallRecord } from './types';

export function callView(call: CallRecord) {
  return {
    id: call.id,
    channelId: call.channelId,
    status: call.status,
    startedByMemberId: call.startedByMemberId,
    startedAt: call.startedAt,
    endedAt: call.endedAt,
  };
}
