import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import type { DownloadVariant } from '../attachment-downloads.service';

export class BeginUploadDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  size!: number;
}

export class SignPartDto {
  @IsInt()
  @Min(1)
  @Max(60)
  number!: number;
}

export class DownloadQueryDto {
  @IsOptional()
  @IsIn(['download', 'preview', 'thumbnail'])
  variant: DownloadVariant = 'download';
}
