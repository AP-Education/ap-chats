import { IsOptional, Matches } from 'class-validator';

import { TrimmedName } from '@/globals/validation/trimmed-name.decorator';

export class CreateRoleDto {
  @TrimmedName()
  name!: string;

  @IsOptional()
  @Matches(/^#[0-9a-f]{6}$/iu)
  color?: string;
}
