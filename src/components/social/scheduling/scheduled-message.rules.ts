import { BadRequestException, ConflictException } from '@nestjs/common';

const LATEST_SEND_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_SCHEDULED_PER_CHANNEL = 100;

export function requireSendTime(sendAt: Date): void {
  const ahead = sendAt.getTime() - Date.now();

  if (ahead <= 0) throw new BadRequestException('Send time must be in the future');
  if (ahead > LATEST_SEND_MS) throw new BadRequestException('Send time must be within a year');
}

/** Counted without a lock: two schedules at the same moment may pass the limit by one. */
export function requireRoomInSchedule(scheduledInChannel: number): void {
  if (scheduledInChannel >= MAX_SCHEDULED_PER_CHANNEL)
    throw new ConflictException('Too many scheduled messages in this channel');
}
