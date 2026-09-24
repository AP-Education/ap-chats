import { Body, Controller, Delete, HttpCode, Param, Post, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/access-token';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('devices')
@UseGuards(AuthGuard)
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @HttpCode(204)
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterDeviceDto): Promise<void> {
    return this.devices.register(user.sub, dto);
  }

  @Delete(':installationId')
  @HttpCode(204)
  unregister(
    @CurrentUser() user: AuthenticatedUser,
    @Param('installationId') installationId: string,
  ): Promise<void> {
    return this.devices.unregister(user.sub, installationId);
  }
}
