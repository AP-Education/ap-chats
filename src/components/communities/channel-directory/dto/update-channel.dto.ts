import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

import { TrimmedName } from '@/globals/validation/trimmed-name.decorator';

export class UpdateChannelDto {
  @IsOptional()
  @TrimmedName()
  name?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsUUID()
  categoryId?: string | null;
}
