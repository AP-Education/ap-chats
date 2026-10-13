import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { TrimmedName } from '@/globals/validation/trimmed-name.decorator';

export class CreateChannelCategoryDto {
  @TrimmedName()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  position?: number;
}
