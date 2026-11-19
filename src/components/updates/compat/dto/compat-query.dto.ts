import { IsIn } from 'class-validator';

import { type ShellPlatform, shellPlatformEnum } from '@/database/drizzle/schema';

export class CompatQueryDto {
  @IsIn(shellPlatformEnum)
  platform!: ShellPlatform;
}
