import { IsIn } from 'class-validator';

import { type ShellPlatform, shellPlatforms } from '../../types';

export class CompatQueryDto {
  @IsIn(shellPlatforms)
  platform!: ShellPlatform;
}
