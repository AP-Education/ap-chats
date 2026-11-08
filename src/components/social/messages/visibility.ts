import { eq, isNotNull, isNull, or, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { chatMessages } from '@/database/drizzle/schema';

type AudienceColumns = { assistantOwnerMemberId: AnyPgColumn; publishedAt: AnyPgColumn };

export function publicMessage(columns: AudienceColumns = chatMessages): SQL {
  return or(isNull(columns.assistantOwnerMemberId), isNotNull(columns.publishedAt))!;
}

export function messageVisibleTo(
  memberId: string | AnyPgColumn,
  columns: AudienceColumns = chatMessages,
): SQL {
  return or(publicMessage(columns), eq(columns.assistantOwnerMemberId, memberId))!;
}

export function privateAssistantMessage(message: {
  assistantOwnerMemberId?: string | null;
  publishedAt?: Date | null;
}): boolean {
  return Boolean(message.assistantOwnerMemberId && !message.publishedAt);
}
