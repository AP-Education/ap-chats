import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { SEARCH_QUERY_LIMIT } from './types';

export class ConversationSearchQuery {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.normalize('NFC').trim() : value,
  )
  @IsString()
  @MaxLength(SEARCH_QUERY_LIMIT)
  q?: string;
}
