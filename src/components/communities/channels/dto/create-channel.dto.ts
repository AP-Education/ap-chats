import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { type ChannelKind, channelKinds } from '../types';

export class CreateChannelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsIn(channelKinds)
  kind!: ChannelKind;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
