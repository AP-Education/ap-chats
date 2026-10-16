import { IsString, Matches } from 'class-validator';

export class MarkUnreadDto {
  /** The first entry to be unread again. */
  @IsString()
  @Matches(/^[1-9][0-9]*$/)
  seq!: string;
}
