import { IsIn, IsUUID } from 'class-validator';

import type { MuteMode } from '../types';

export class OpenDirectMessageDto {
  @IsUUID()
  memberId!: string;
}

export class UpdateDirectMessageMuteDto {
  @IsIn(['unmute', 'hour', 'day', 'indefinite'])
  mode!: MuteMode;
}
