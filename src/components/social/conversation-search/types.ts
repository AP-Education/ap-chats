import type { MemberSummary } from '@/components/workspaces/members/types';

export interface ConversationSearchResults {
  channels: { id: string; name: string }[];
  conversations: {
    id: string;
    participant: MemberSummary & { active: boolean };
  }[];
  people: MemberSummary[];
}

export const SEARCH_QUERY_LIMIT = 80;
export const SEARCH_GROUP_LIMIT = 20;
