import { IsUUID } from 'class-validator';

export class WatchChannelDto {
  @IsUUID()
  workspaceId!: string;

  @IsUUID()
  channelId!: string;
}
