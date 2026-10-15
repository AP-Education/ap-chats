import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';

import { DevicesService } from './devices.service';
import { ReleaseDeviceDto } from './dto';

/** Unguarded on purpose: a phone whose session is already gone still has to stop ringing. */
@Controller('devices')
export class DeviceReleaseController {
  constructor(private readonly devices: DevicesService) {}

  @Post(':installationId/release')
  @HttpCode(204)
  release(
    @Param('installationId') installationId: string,
    @Body() dto: ReleaseDeviceDto,
  ): Promise<void> {
    return this.devices.release(installationId, dto.releaseKey);
  }
}
