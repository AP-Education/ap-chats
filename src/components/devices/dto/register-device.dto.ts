import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { platformEnum } from '@/database/drizzle/schema';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  installationId!: string;

  @IsIn(platformEnum)
  platform!: (typeof platformEnum)[number];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  @Matches(/^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/u)
  pushToken?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  voipToken?: string;

  @IsOptional()
  @IsIn(['sandbox', 'production'])
  apnsEnvironment?: 'sandbox' | 'production';
}
