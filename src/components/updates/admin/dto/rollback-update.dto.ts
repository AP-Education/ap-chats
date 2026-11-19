import { IsBoolean, IsOptional } from 'class-validator';

export class RollbackUpdateDto {
  /** Go back to the bundle in the store build even when an older update is still offered. */
  @IsOptional()
  @IsBoolean()
  embedded?: boolean;
}
