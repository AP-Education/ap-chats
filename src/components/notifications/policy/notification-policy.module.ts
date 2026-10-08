import { Module } from '@nestjs/common';

import { NotificationPolicyService } from './notification-policy.service';

@Module({ providers: [NotificationPolicyService], exports: [NotificationPolicyService] })
export class NotificationPolicyModule {}
