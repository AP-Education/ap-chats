import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { platformEnum } from '@/database/drizzle/schema';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  installationId!: string;

  @IsIn(platformEnum)
  platform!: (typeof platformEnum)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  pushToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  voipToken?: string;
}
