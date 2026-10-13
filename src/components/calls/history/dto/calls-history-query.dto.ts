import { IsIn, IsOptional, IsString } from 'class-validator';

import type { CallHistoryFilter } from '../types';

export class CallsHistoryQueryDto {
  @IsOptional()
  @IsIn(['all', 'missed'], { message: 'Invalid calls filter' })
  filter: CallHistoryFilter = 'all';

  @IsOptional()
  @IsString()
  before?: string;
}
