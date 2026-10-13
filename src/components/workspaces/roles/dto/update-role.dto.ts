import { IsBoolean, IsOptional, Matches, ValidateIf } from 'class-validator';

import { TrimmedName } from '@/globals/validation/trimmed-name.decorator';

export class UpdateRoleDto {
  @IsOptional()
  @TrimmedName()
  name?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @Matches(/^#[0-9a-f]{6}$/iu)
  color?: string | null;

  @IsOptional()
  @IsBoolean()
  isHoisted?: boolean;
}
