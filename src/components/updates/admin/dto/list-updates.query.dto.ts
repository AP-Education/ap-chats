import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  type ShellPlatform,
  shellPlatformEnum,
  type UpdateChannel,
  updateChannelEnum,
} from '@/database/drizzle/schema';

export class ListUpdatesQueryDto {
  @IsIn(updateChannelEnum)
  channel!: UpdateChannel;

  @IsOptional()
  @IsIn(shellPlatformEnum)
  platform?: ShellPlatform;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
