import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBase64,
  IsDefined,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { GIF_MEDIA } from '../../content/gif-links';

class AttachmentRefDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

class GifMediaDto {
  @Matches(GIF_MEDIA)
  @MaxLength(2048)
  url!: string;

  @IsInt()
  @Min(1)
  @Max(4096)
  width!: number;

  @IsInt()
  @Min(1)
  @Max(4096)
  height!: number;

  /** The GIF's ThumbHash, base64, which clients tint and paint around it with. */
  @IsOptional()
  @IsBase64()
  @MaxLength(64)
  placeholder?: string;
}

/** A GIF the client found for a GIF link in its text: the only block a message takes yet. */
export class GifBlockDto {
  @Equals('gif')
  type!: 'gif';

  @IsIn(['klipy', 'giphy', 'tenor'])
  provider!: 'klipy' | 'giphy' | 'tenor';

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  link!: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @ValidateNested()
  @Type(() => GifMediaDto)
  media!: GifMediaDto;
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

  @ValidateIf((dto: SendMessageDto) => Boolean(dto.quoteText?.trim()))
  @IsDefined({ message: 'Quote requires a reply target' })
  @IsUUID()
  replyToMessageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  quoteText?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => GifBlockDto)
  blocks?: GifBlockDto[];
}

export class EditMessageDto {
  @IsString()
  @MaxLength(32768)
  markdown!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  revision?: number;

  /** Only a GIF found for a new link; the current one stays while its link does. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => GifBlockDto)
  blocks?: GifBlockDto[];
}

export class BatchDeleteMessagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  messageIds!: string[];
}
