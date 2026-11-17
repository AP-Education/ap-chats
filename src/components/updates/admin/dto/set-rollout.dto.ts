import { IsInt, Max, Min } from 'class-validator';

export class SetRolloutDto {
  @IsInt()
  @Min(0)
  @Max(100)
  percent!: number;
}
