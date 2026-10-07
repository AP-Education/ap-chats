import { IsBoolean } from 'class-validator';

export class WebPushPresenceDto {
  @IsBoolean()
  focused!: boolean;
}
