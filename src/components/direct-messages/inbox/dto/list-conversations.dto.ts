import { IsOptional, IsString } from 'class-validator';

export class ListConversationsDto {
  @IsOptional()
  @IsString()
  before?: string;
}
