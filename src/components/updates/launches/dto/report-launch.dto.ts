import {
  IsBoolean,
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { type ShellPlatform, shellPlatformEnum } from '@/database/drizzle/schema';

export class ReportLaunchDto {
  @IsIn(shellPlatformEnum)
  platform!: ShellPlatform;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  runtimeVersion!: string;

  /** Null while the shell runs the bundle embedded in its binary. */
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  updateId!: string | null;

  /** expo-updates fell back to an older bundle because the newer one failed to start. */
  @IsBoolean()
  isEmergencyLaunch!: boolean;

  /** The shell started and loaded the web app. */
  @IsBoolean()
  ok!: boolean;
}
