import { IsBoolean } from 'class-validator';

export class UpdateAttentionDto {
  @IsBoolean()
  attending!: boolean;
}
