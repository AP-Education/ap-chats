import { ConflictException } from '@nestjs/common';

import type { InboxCursor } from './types';

export function encodeInboxCursor({ at, id }: InboxCursor): string {
  return Buffer.from(JSON.stringify({ at: at.toISOString(), id })).toString('base64url');
}

export function decodeInboxCursor(value: string): InboxCursor {
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      at: string;
      id: string;
    };
    const isValid = Number.isFinite(Date.parse(cursor.at)) && /^[0-9a-f-]{36}$/i.test(cursor.id);
    if (!isValid) throw new Error('Malformed cursor');

    return { at: new Date(cursor.at), id: cursor.id };
  } catch {
    throw new ConflictException('Invalid conversation cursor');
  }
}
