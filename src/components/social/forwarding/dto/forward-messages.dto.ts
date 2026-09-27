import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ForwardMessagesDto {
  @IsUUID()
  sourceChannelId!: string;

  @IsUUID()
  batchNonce!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  messageIds!: string[];
}
