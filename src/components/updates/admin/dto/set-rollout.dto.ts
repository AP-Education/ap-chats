import { IsBoolean, IsInt, Max, Min, ValidateIf } from 'class-validator';

export class SetRolloutDto {
  @IsInt()
  @Min(0)
  @Max(100)
  percent!: number;

  /** Required to change a paused update, so a request made before the pause cannot undo it. */
  // Skipped only when left out: null is not a boolean and is refused.
  @ValidateIf((_dto, value) => value !== undefined)
  @IsBoolean()
  resume?: boolean;
}
