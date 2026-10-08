import { Type } from 'class-transformer';
import {
  IsDefined,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class SubscriptionKeys {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+={0,2}$/u)
  @MaxLength(100)
  p256dh!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]+={0,2}$/u)
  @MaxLength(32)
  auth!: string;
}

export class RegisterWebPushDto {
  @IsUUID()
  installationId!: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => SubscriptionKeys)
  keys!: SubscriptionKeys;
}
