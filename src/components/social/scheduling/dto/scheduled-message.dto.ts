import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

import { SendMessageDto } from '../../posting/dto/send-message.dto';

/** A send request held until `sendAt`. */
export class ScheduleMessageDto extends SendMessageDto {
  @Type(() => Date)
  @IsDate()
  sendAt!: Date;
}

/** New text, a new time, or both. */
export class ChangeScheduledMessageDto {
  @ValidateIf(
    (dto: ChangeScheduledMessageDto) => dto.sendAt === undefined || dto.markdown !== undefined,
  )
  @IsString()
  @MaxLength(32768)
  markdown?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  sendAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  revision?: number;
}
