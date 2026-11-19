import { Controller, Get, Header, Query } from '@nestjs/common';

import { CompatService, type ShellCompat } from './compat.service';
import { CompatQueryDto } from './dto';

/** Unguarded on purpose: a shell asks before anyone signs in, and a stale one must still be told. */
@Controller('updates/compat')
export class CompatController {
  constructor(private readonly compat: CompatService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  get(@Query() { platform }: CompatQueryDto): ShellCompat {
    return this.compat.forPlatform(platform);
  }
}
