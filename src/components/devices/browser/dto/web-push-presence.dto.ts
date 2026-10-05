import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class WebPushPresenceDto {
  @IsBoolean()
  focused!: boolean;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  channelId?: string;
}
