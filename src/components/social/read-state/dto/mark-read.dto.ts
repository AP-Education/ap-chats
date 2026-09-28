import { IsString, Matches } from 'class-validator';

export class MarkReadDto {
  @IsString()
  @Matches(/^(0|[1-9][0-9]*)$/)
  seq!: string;
}
