import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import type { ChannelKind } from '../types';

export class CreateChannelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsIn(['public', 'private'])
  kind!: Exclude<ChannelKind, 'dm'>;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
