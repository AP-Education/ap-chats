import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';

import { PrincipalDto, toPrincipal } from '@/components/workspaces/access/dto/principal.dto';

import type { ChannelPermissions } from '../types';

export class ChannelPermissionsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PrincipalDto)
  view!: PrincipalDto[];

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PrincipalDto)
  post!: PrincipalDto[];

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PrincipalDto)
  manage!: PrincipalDto[];
}

export function toChannelPermissions(dto: ChannelPermissionsDto): ChannelPermissions {
  return {
    view: dto.view.map(toPrincipal),
    post: dto.post.map(toPrincipal),
    manage: dto.manage.map(toPrincipal),
  };
}
