import { Body, Controller, HttpCode, Put } from '@nestjs/common';

import { type AuthenticatedUser, CurrentUser, UseAuthGuards } from '@/components/auth';

import { SyncProfileDto } from './sync-profile.dto';
import { UserProfilesService } from './user-profiles.service';

@Controller('user-profile')
@UseAuthGuards()
export class UserProfilesController {
  constructor(private readonly profiles: UserProfilesService) {}

  @Put('me')
  @HttpCode(204)
  sync(@CurrentUser() user: AuthenticatedUser, @Body() dto: SyncProfileDto): Promise<void> {
    return this.profiles.sync(user.sub, user.appId, dto.idToken);
  }
}
