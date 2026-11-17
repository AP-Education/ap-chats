import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import {
  type ShellPlatform,
  shellPlatformEnum,
  type UpdateChannel,
  updateChannelEnum,
} from '@/database/drizzle/schema';

export class UpdateAssetDto {
  /** Base64url SHA-256 without padding. */
  @Matches(/^[A-Za-z0-9_-]{43}$/u)
  hash!: string;

  @Matches(/^[A-Za-z0-9._-]{1,128}$/u)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  contentType!: string;

  @IsOptional()
  @Matches(/^\.[A-Za-z0-9]{1,16}$/u)
  fileExtension?: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;
}

export class UpdateManifestDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => UpdateAssetDto)
  launchAsset!: UpdateAssetDto;

  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => UpdateAssetDto)
  assets!: UpdateAssetDto[];
}

export class PublishUpdateDto {
  @IsIn(shellPlatformEnum)
  platform!: ShellPlatform;

  @IsIn(updateChannelEnum)
  channel!: UpdateChannel;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  runtimeVersion!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => UpdateManifestDto)
  manifest!: UpdateManifestDto;

  /** Defaults to 10% on production and everyone on preview, where testers need it at once. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercent?: number;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @IsOptional()
  @Matches(/^[0-9a-f]{7,40}$/u)
  gitCommit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  createdBy?: string;
}
