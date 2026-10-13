import { Type } from 'class-transformer';
import { IsDefined, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { TrimmedName } from '@/globals/validation/trimmed-name.decorator';

import { ChannelPermissionsDto } from '../../channel-access/permissions/dto/channel-permissions.dto';

export class CreateChannelDto {
  @TrimmedName()
  name!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChannelPermissionsDto)
  permissions!: ChannelPermissionsDto;
}
