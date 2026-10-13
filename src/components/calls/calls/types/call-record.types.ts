import type { CallStatus } from './call-status.types';

export interface CallRecord {
  id: string;
  workspaceId: string;
  channelId: string;
  roomName: string;
  status: CallStatus;
  startedByMemberId: string;
  startedAt: Date;
  endedAt: Date | null;
}
