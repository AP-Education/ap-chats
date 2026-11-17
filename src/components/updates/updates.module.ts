import { Module } from '@nestjs/common';

import { CompatController, CompatService } from './compat';

@Module({
  controllers: [CompatController],
  providers: [CompatService],
})
export class UpdatesModule {}
