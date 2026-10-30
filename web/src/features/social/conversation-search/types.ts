import type { MemberSummary } from '@/features/workspaces/types';

export interface ConversationSearchResults {
  channels: { id: string; name: string }[];
  conversations: { id: string; participant: MemberSummary & { active: boolean } }[];
  people: MemberSummary[];
}

export interface SearchResult {
  key: string;
  kind: 'channel' | 'conversation' | 'person';
  id: string;
  name: string;
  avatarPath?: string | null;
  active?: boolean;
}
