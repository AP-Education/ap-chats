import { IsIn, IsOptional } from 'class-validator';

import {
  type ChangeNotificationSettings,
  type NotificationLevel,
  notificationLevels,
} from '../types';

export class ChangeNotificationSettingsDto implements ChangeNotificationSettings {
  @IsIn(['level', 'mute', 'unmute'])
  type!: ChangeNotificationSettings['type'];

  @IsOptional()
  @IsIn(notificationLevels)
  level?: NotificationLevel;

  @IsOptional()
  @IsIn(['hour', 'day', 'indefinite'])
  duration?: ChangeNotificationSettings['duration'];
}
