import { Type } from 'class-transformer';
import {
  IsDefined,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { ChannelPermissionsDto } from '../../channel-access/permissions/dto/channel-permissions.dto';

export class CreateChannelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChannelPermissionsDto)
  permissions!: ChannelPermissionsDto;
}
