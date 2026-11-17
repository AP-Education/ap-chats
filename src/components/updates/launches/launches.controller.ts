import { Body, Controller, HttpCode, Post } from '@nestjs/common';

import { ReportLaunchDto } from './dto';
import { LaunchesService } from './launches.service';

/** Unguarded on purpose: a broken update may never reach sign-in, and that is what we must see. */
@Controller('updates/launches')
export class LaunchesController {
  constructor(private readonly launches: LaunchesService) {}

  @Post()
  @HttpCode(204)
  report(@Body() dto: ReportLaunchDto): Promise<void> {
    return this.launches.report(dto);
  }
}
