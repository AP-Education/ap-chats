import { IsIn, ValidateIf } from 'class-validator';

import {
  type ChangeNotificationSettings,
  type MuteDuration,
  muteDurations,
  type NotificationLevel,
  notificationLevels,
} from '../types';

export class ChangeNotificationSettingsDto {
  @IsIn(['level', 'mute', 'unmute'])
  type!: ChangeNotificationSettings['type'];

  @ValidateIf((dto: ChangeNotificationSettingsDto) => dto.type === 'level')
  @IsIn(notificationLevels)
  level?: NotificationLevel;

  @ValidateIf((dto: ChangeNotificationSettingsDto) => dto.type === 'mute')
  @IsIn(muteDurations)
  duration?: MuteDuration;
}

export function toNotificationChange(
  dto: ChangeNotificationSettingsDto,
): ChangeNotificationSettings {
  switch (dto.type) {
    case 'level':
      return { type: 'level', level: dto.level! };
    case 'mute':
      return { type: 'mute', duration: dto.duration! };
    case 'unmute':
      return { type: 'unmute' };
  }
}
