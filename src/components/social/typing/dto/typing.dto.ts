import { IsBoolean, IsUUID } from 'class-validator';

export class TypingDto {
  @IsUUID()
  workspaceId!: string;

  @IsUUID()
  channelId!: string;

  @IsBoolean()
  isTyping!: boolean;
}
