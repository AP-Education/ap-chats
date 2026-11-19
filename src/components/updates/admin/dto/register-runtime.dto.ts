import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

import { type ShellPlatform, shellPlatformEnum } from '@/database/drizzle/schema';

export class RegisterRuntimeDto {
  @IsIn(shellPlatformEnum)
  platform!: ShellPlatform;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  runtimeVersion!: string;

  @IsInt()
  @Min(1)
  @Max(2_100_000_000)
  buildNumber!: number;
}
