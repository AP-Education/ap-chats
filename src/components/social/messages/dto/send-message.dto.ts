import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class AttachmentRefDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class SendMessageDto {
  @IsString()
  @MaxLength(32768)
  markdown!: string;

  @IsUUID()
  clientNonce!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @ArrayUnique((ref: AttachmentRefDto) => ref.id)
  @ValidateNested({ each: true })
  @Type(() => AttachmentRefDto)
  attachments?: AttachmentRefDto[];

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
