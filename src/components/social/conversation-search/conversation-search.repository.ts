import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { ConversationSearchResults } from './types';

export abstract class ConversationSearchRepository {
  abstract find(member: WorkspaceMember, query: string): Promise<ConversationSearchResults>;
}
