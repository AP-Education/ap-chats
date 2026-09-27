import { IsString, MaxLength } from 'class-validator';

export class SyncProfileDto {
  @IsString()
  @MaxLength(16_384)
  idToken!: string;
}
