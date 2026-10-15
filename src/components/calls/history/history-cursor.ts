import { ConflictException } from '@nestjs/common';

export interface HistoryCursor {
  startedAt: Date;
  id: string;
}

export function encodeHistoryCursor({ startedAt, id }: HistoryCursor): string {
  return Buffer.from(JSON.stringify({ startedAt: startedAt.toISOString(), id })).toString(
    'base64url',
  );
}

export function decodeHistoryCursor(value: string): HistoryCursor {
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      startedAt: string;
      id: string;
    };
    const isValid =
      Number.isFinite(Date.parse(cursor.startedAt)) && /^[0-9a-f-]{36}$/i.test(cursor.id);
    if (!isValid) throw new Error('Malformed cursor');

    return { startedAt: new Date(cursor.startedAt), id: cursor.id };
  } catch {
    throw new ConflictException('Invalid calls cursor');
  }
}
