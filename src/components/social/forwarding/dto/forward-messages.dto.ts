import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsIn,
  IsUUID,
  ValidateNested,
} from 'class-validator';

class ForwardTargetDto {
  @IsIn(['channel', 'member'])
  kind!: 'channel' | 'member';

  @IsUUID()
  id!: string;
}

export class ForwardMessagesDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => ForwardTargetDto)
  target!: ForwardTargetDto;

  @IsUUID()
  sourceChannelId!: string;

  @IsUUID()
  batchNonce!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  messageIds!: string[];
}
