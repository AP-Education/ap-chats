import { BadRequestException, Injectable } from '@nestjs/common';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ConversationSearchRepository } from './conversation-search.repository';
import { type ConversationSearchResults, SEARCH_QUERY_LIMIT } from './types';

@Injectable()
export class ConversationSearchService {
  constructor(private readonly repository: ConversationSearchRepository) {}

  search(member: WorkspaceMember, query = ''): Promise<ConversationSearchResults> {
    const text = query.normalize('NFC').trim();
    if ([...text].length > SEARCH_QUERY_LIMIT)
      throw new BadRequestException('Search query is too long');
    if (!text) return Promise.resolve({ channels: [], conversations: [], people: [] });
    return this.repository.find(member, text);
  }
}
