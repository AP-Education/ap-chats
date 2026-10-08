import { sql, type SQLWrapper } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { directMessages, workspaceMembers } from '@/database/drizzle/schema';

export function activeDmPair(channelId: SQLWrapper) {
  const first = alias(workspaceMembers, 'first_peer');
  const second = alias(workspaceMembers, 'second_peer');
  return sql<boolean>`exists (select 1 from ${directMessages}
    join ${workspaceMembers} as ${sql.identifier('first_peer')} on ${first.id} = ${directMessages.firstMemberId}
    join ${workspaceMembers} as ${sql.identifier('second_peer')} on ${second.id} = ${directMessages.secondMemberId}
    where ${directMessages.channelId} = ${channelId} and ${first.status} = 'active' and ${second.status} = 'active')`;
}
