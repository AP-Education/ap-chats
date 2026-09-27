import { IsArray, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MaxLength(32768)
  markdown!: string;

  @IsUUID()
  clientNonce!: string;

  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  quoteText?: string;
}

export class EditMessageDto {
  @IsString()
  @MaxLength(32768)
  markdown!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  revision?: number;
}

export class BatchDeleteMessagesDto {
  @IsArray()
  @IsUUID('all', { each: true })
  messageIds!: string[];
}
