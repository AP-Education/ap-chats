import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

export class HistoryQueryDto {
  @IsOptional()
  @Matches(/^(0|[1-9][0-9]*)$/)
  before?: string;

  @IsOptional()
  @Matches(/^(0|[1-9][0-9]*)$/)
  after?: string;

  @IsOptional()
  @Matches(/^(0|[1-9][0-9]*)$/)
  snapshot?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class HistoryWindowQueryDto {
  @IsOptional()
  @IsUUID()
  messageId?: string;
}
