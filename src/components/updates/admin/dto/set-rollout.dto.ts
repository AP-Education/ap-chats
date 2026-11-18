import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class SetRolloutDto {
  @IsInt()
  @Min(0)
  @Max(100)
  percent!: number;

  /** Required to change a paused update, so a request made before the pause cannot undo it. */
  @IsOptional()
  @IsBoolean()
  resume?: boolean;
}
