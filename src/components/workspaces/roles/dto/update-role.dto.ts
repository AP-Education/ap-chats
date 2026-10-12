import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @Matches(/^#[0-9a-f]{6}$/iu)
  color?: string | null;

  @IsOptional()
  @IsBoolean()
  isHoisted?: boolean;
}
